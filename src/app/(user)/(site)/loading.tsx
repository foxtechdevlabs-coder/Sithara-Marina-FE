import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="text-brand-600 flex justify-center px-4 py-16">
      <Spinner />
    </div>
  );
}
