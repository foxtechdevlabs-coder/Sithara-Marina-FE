"use client";

import { useRef, useState } from "react";

import { BODY, MUTED } from "@/components/admin/admin-theme";
import { Notice } from "@/components/admin/form-parts";
import { documentUploadMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import {
  PARTNER_DOCUMENT_TYPES,
  partnerDocumentProblem,
  uploadPartnerDocument,
} from "@/services/admin/media.service";
import { attachPartnerDocument, type PartnerDocument } from "@/services/admin/partners.service";

import { documentTitle, formatDate, newestFirst } from "../utils/partner-form";

const link = "text-[12px] underline underline-offset-2 hover:opacity-70 disabled:opacity-50";

/**
 * The partner's agreement. The API can add documents but not remove them, so
 * "Replace" adds a new file: the newest is the current version and the older
 * ones stay as its history. Upload: POST /admin/media/uploads, then the signed
 * link, then POST /admin/partners/{id}/documents.
 */
export function AgreementPanel({
  partnerId,
  documents,
  onAdded,
}: {
  partnerId: string;
  documents: PartnerDocument[];
  onAdded: (document: PartnerDocument) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const picker = useRef<HTMLInputElement>(null);

  const [current, ...older] = newestFirst(documents);
  const uploading = progress !== null;

  async function upload(file: File) {
    setProblem("");
    setNotice("");
    const invalid = partnerDocumentProblem(file);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    setProgress(0);
    try {
      const mediaId = await uploadPartnerDocument(file, setProgress);
      onAdded(
        await attachPartnerDocument(partnerId, {
          media_id: mediaId,
          title: documentTitle(file.name),
        }),
      );
      setNotice("Agreement uploaded.");
    } catch (err) {
      setProblem(documentUploadMessage(err));
    } finally {
      setProgress(null);
    }
  }

  return (
    <section
      aria-labelledby="agreement-title"
      className="border border-[#e3e1dc] bg-white px-[16px] pt-[20px] pb-[20px]"
    >
      <h2 id="agreement-title" className="text-[18px] leading-[24px]">
        Agreement document
      </h2>
      <p className="mt-[10px] text-[12px] leading-[18px]" style={{ color: BODY }}>
        {current ? `${current.filename} · Current version` : "No agreement uploaded yet."}
      </p>

      <input
        ref={picker}
        type="file"
        aria-label="Agreement file"
        accept={PARTNER_DOCUMENT_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="mt-[8px] flex flex-wrap items-center gap-x-[14px] gap-y-[6px]">
        {current && (
          <a href={current.url} target="_blank" rel="noopener noreferrer" className={link}>
            View / download
          </a>
        )}
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={uploading}
          className={link}
        >
          {uploading
            ? `Uploading ${Math.round((progress ?? 0) * 100)}%`
            : current
              ? "Replace"
              : "Upload agreement"}
        </button>
      </div>

      {older.length > 0 && (
        <div className="mt-[14px]">
          <h3 className="text-[11px]" style={{ color: MUTED }}>
            Version history
          </h3>
          <ul className="mt-[4px] text-[12px] leading-[20px]">
            {older.map((d) => (
              <li key={d.id}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-70"
                >
                  {d.filename}
                </a>
                <span style={{ color: BODY }}> · {formatDate(d.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {problem && (
        <Notice tone="error" className="mt-[12px]">
          {problem}
        </Notice>
      )}
      {notice && <Notice className="mt-[12px]">{notice}</Notice>}
    </section>
  );
}
