import { WorkForm } from '@/components/admin/WorkForm';

export default function NewWorkPage() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg">New work</h2>
      <p className="text-xs opacity-60 max-w-prose">
        Save first to enable image uploads. Once saved you&apos;ll be redirected
        to the edit page where you can add images.
      </p>
      <WorkForm mode="new" />
    </section>
  );
}
