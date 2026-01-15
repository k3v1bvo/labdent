// export default function Home() {
//   return (
//     <main className="flex h-screen items-center justify-center bg-blue-100">
//       <h1 className="text-4xl font-bold text-blue-700">
//         Tailwind funcionando 🎉
//       </h1>
//     </main>
//   );
// }


// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}

