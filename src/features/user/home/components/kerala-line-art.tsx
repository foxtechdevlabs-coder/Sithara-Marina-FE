import Image from "next/image";

/**
 * Decorative Kerala line-art band between the About and Featured yacht
 * sections. Two drawings are composed as in the reference (measured on a
 * 1728 × 521 canvas): the houseboat scene, cut off at 32%, and the harbour
 * scene to its right. `mix-blend-multiply` on the outer wrapper (the
 * stacking-context root, so the blend reaches the page behind it) drops their
 * white backgrounds, letting the band overlap the About gallery from `xl`.
 */
export function KeralaLineArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative overflow-hidden mix-blend-multiply xl:-mt-[calc(5rem+7.2vw)]"
    >
      <div className="relative left-1/2 aspect-[1728/521] w-[160vw] -translate-x-1/2 md:w-full">
        <div className="absolute inset-y-0 left-0 w-[32.12%] overflow-hidden">
          <Image
            src="/images/home/kerala-line-art-houseboat.png"
            alt=""
            width={1592}
            height={988}
            sizes="(min-width: 768px) 49vw, 78vw"
            className="absolute top-0 left-[-0.9%] h-full w-[151.2%] max-w-none"
          />
        </div>
        <Image
          src="/images/home/kerala-line-art-harbour.png"
          alt=""
          width={1946}
          height={808}
          sizes="(min-width: 768px) 68vw, 109vw"
          className="absolute top-[4.03%] left-[32.12%] h-[93.3%] w-[67.77%]"
        />
      </div>
    </div>
  );
}
