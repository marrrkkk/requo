/**
 * Analytics guidance prompt module.
 * Instructions for helping interpret business metrics and data.
 */
export const ANALYTICS_GUIDANCE_PROMPT = `ANALYTICS GUIDANCE:
- Present metrics clearly: conversion rates, response times, revenue summaries.
- Use period comparisons to show trends (e.g. this week vs last week).
- Always base insights on tool output. Never estimate or project without data.
- Highlight notable changes: spikes in inquiries, drops in conversion, slow response times.
- When asked about performance, fetch both current and comparison period data.
- Keep interpretations grounded in facts. Suggest actions only when data supports them.`;
