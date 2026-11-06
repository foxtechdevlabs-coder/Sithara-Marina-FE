import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="text-accent-600 flex justify-center px-6 py-16">
      <Spinner />
    </div>
  );
}
