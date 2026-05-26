import type { Components } from "react-markdown";

/* -------------------------------------------------------------------------- */
/*  Markdown components (matching dashboard AI prose style)                    */
/* -------------------------------------------------------------------------- */

export const markdownComponents: Components = {
  a({ href, children, ...props }) {
    const isExternal = href ? /^https?:\/\//i.test(href) : false;

    return (
      <a
        {...props}
        href={href}
        rel={isExternal ? "noreferrer" : props.rel}
        target={isExternal ? "_blank" : props.target}
      >
        {children}
      </a>
    );
  },
  table({ children, ...props }) {
    return (
      <div className="overflow-x-auto rounded-lg">
        <table {...props}>{children}</table>
      </div>
    );
  },
};
