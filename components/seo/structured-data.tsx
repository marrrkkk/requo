type StructuredDataProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
  id: string;
};

export function StructuredData({ data, id }: StructuredDataProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}
