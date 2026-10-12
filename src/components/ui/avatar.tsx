import React from "react";

interface AvatarProps {
  name: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, className = "" }) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white font-semibold ${className}`}
    >
      {initials}
    </div>
  );
};
