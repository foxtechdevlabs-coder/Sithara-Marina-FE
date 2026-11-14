const BODY = "#4a4f55";

/**
 * The page body as text: blank lines separate paragraphs and single line breaks
 * are kept. React escapes all of it, so markup in the body is shown as typed and
 * never run: nothing is rendered as HTML.
 */
export function ContentBody({ body }: { body: string }) {
  const paragraphs = body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/^\n+|\s+$/g, ""))
    .filter(Boolean);
  return (
    <div className="mt-[48px] max-w-[790px] space-y-[20px] text-[16px] leading-[27px] lg:mt-[64px]" style={{ color: BODY }}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="break-words whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
