type JsonLdRecord = Record<string, unknown> | Array<Record<string, unknown>>;

export interface JsonLdProps {
  data: JsonLdRecord;
  id?: string;
}

/**
 * Server-rendered JSON-LD script tag with safe HTML encoding for crawler & AI readability.
 */
export function JsonLd({ data, id }: JsonLdProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
