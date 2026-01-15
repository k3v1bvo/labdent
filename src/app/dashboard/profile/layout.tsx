"use client";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Este layout anula el del admin
  return <>{children}</>;
}
