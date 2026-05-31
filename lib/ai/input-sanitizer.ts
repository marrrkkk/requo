/**
 * AI Input Sanitizer
 *
 * Pure synchronous function that detects and neutralizes prompt injection
 * attempts in user input before it reaches the AI provider.
 *
 * Performance target: <5ms per input (no network calls, regex-only).
 */

export interface SanitizationResult {
  status: "clean" | "sanitized" | "rejected";
  output: string;
  patterns: string[]; // matched patterns if any
}

/**
 * High-confidence injection patterns that trigger immediate rejection.
 * These are normalized to case-insensitive matching with flexible whitespace.
 */
const REJECTION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // Direct instruction override attempts
  {
    pattern: /ignore\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|context|rules?|guidelines?)/i,
    name: "instruction_override",
  },
  {
    pattern: /disregard\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|context|rules?|guidelines?)/i,
    name: "instruction_override",
  },
  {
    pattern: /forget\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|context|rules?|guidelines?)/i,
    name: "instruction_override",
  },
  // Role-switching attempts
  {
    pattern: /you\s+are\s+now\s+(?:a|an|the)\b/i,
    name: "role_switch",
  },
  {
    pattern: /act\s+as\s+(?:a|an|the|if)\b/i,
    name: "role_switch",
  },
  {
    pattern: /pretend\s+(?:you(?:'re|\s+are)\s+|to\s+be\s+)/i,
    name: "role_switch",
  },
  {
    pattern: /from\s+now\s+on\s+you\s+(?:are|will|should|must)/i,
    name: "role_switch",
  },
  {
    pattern: /switch(?:ing)?\s+(?:to|into)\s+(?:\w+\s+)?mode/i,
    name: "role_switch",
  },
  // System prompt extraction
  {
    pattern: /(?:reveal|show|display|print|output|repeat|echo)\s+(?:your\s+)?(?:system\s+)?prompt/i,
    name: "prompt_extraction",
  },
  {
    pattern: /what\s+(?:is|are)\s+your\s+(?:system\s+)?(?:instructions?|rules?|prompt|guidelines?)/i,
    name: "prompt_extraction",
  },
  {
    pattern: /(?:tell|give)\s+me\s+your\s+(?:system\s+)?(?:instructions?|rules?|prompt|guidelines?)/i,
    name: "prompt_extraction",
  },
  // Direct system prompt manipulation
  {
    pattern: /\bsystem\s*(?::|\s+)prompt\b/i,
    name: "system_prompt_injection",
  },
  {
    pattern: /\[?\s*system\s*\]?\s*(?::|\n)/i,
    name: "system_prompt_injection",
  },
  // Delimiter injection — XML-style tags commonly used to frame system instructions
  {
    pattern: /<\s*(?:system|instruction|prompt|context|rule|admin|internal|hidden|secret)\s*>/i,
    name: "delimiter_injection",
  },
  {
    pattern: /<\s*\/\s*(?:system|instruction|prompt|context|rule|admin|internal|hidden|secret)\s*>/i,
    name: "delimiter_injection",
  },
  // Encoded variants — base64 "ignore" prefix, URL-encoded patterns
  {
    pattern: /aWdub3Jl/i, // base64 for "ignore"
    name: "encoded_injection",
  },
  {
    pattern: /%69%67%6[eE]%6[fF]%72%65/i, // URL-encoded "ignore"
    name: "encoded_injection",
  },
  {
    pattern: /&#(?:105|x69);&#(?:103|x67);&#(?:110|x6[eE]);&#(?:111|x6[fF]);&#(?:114|x72);&#(?:101|x65);/i, // HTML-encoded "ignore"
    name: "encoded_injection",
  },
];

/**
 * Patterns that trigger sanitization (removal) rather than outright rejection.
 * These are lower-confidence indicators that might appear in legitimate input
 * but should be neutralized.
 */
const SANITIZATION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // Triple backtick blocks that might frame injected instructions
  {
    pattern: /```\s*(?:system|instruction|prompt|admin|internal)\b[\s\S]*?```/gi,
    name: "code_block_injection",
  },
  // Markdown-style heading attempts to inject instructions
  {
    pattern: /^#{1,3}\s*(?:system|instruction|new\s+instructions?|override)/gim,
    name: "heading_injection",
  },
  // Separator-based injection (----, ====, etc. followed by instruction keywords)
  {
    pattern: /(?:[-=]{4,})\s*\n\s*(?:new\s+)?(?:system|instructions?|rules?|prompt)\s*(?::|\n)/gim,
    name: "separator_injection",
  },
];

/**
 * Sanitizes user input for AI processing.
 *
 * Returns:
 * - `rejected` for high-confidence injection attempts
 * - `sanitized` when lower-confidence patterns were removed
 * - `clean` when no patterns were detected
 */
export function sanitizeAiInput(input: string): SanitizationResult {
  try {
    // Handle empty/null input
    if (!input || input.trim().length === 0) {
      return { status: "clean", output: input || "", patterns: [] };
    }

    const matchedPatterns: string[] = [];

    // Check rejection patterns first (high-confidence)
    for (const { pattern, name } of REJECTION_PATTERNS) {
      // Reset lastIndex for patterns with global flag
      pattern.lastIndex = 0;
      if (pattern.test(input)) {
        matchedPatterns.push(name);
      }
    }

    if (matchedPatterns.length > 0) {
      return {
        status: "rejected",
        output: "",
        patterns: Array.from(new Set(matchedPatterns)),
      };
    }

    // Check sanitization patterns (lower-confidence, remove matches)
    let sanitizedOutput = input;
    const sanitizedPatterns: string[] = [];

    for (const { pattern, name } of SANITIZATION_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      if (pattern.test(sanitizedOutput)) {
        sanitizedPatterns.push(name);
        // Reset again before replace
        pattern.lastIndex = 0;
        sanitizedOutput = sanitizedOutput.replace(pattern, "");
      }
    }

    if (sanitizedPatterns.length > 0) {
      return {
        status: "sanitized",
        output: sanitizedOutput.trim(),
        patterns: Array.from(new Set(sanitizedPatterns)),
      };
    }

    return { status: "clean", output: input, patterns: [] };
  } catch {
    // Catch unexpected errors (e.g., catastrophic backtracking)
    // Fail-closed: reject the input
    return {
      status: "rejected",
      output: "",
      patterns: ["processing_error"],
    };
  }
}
