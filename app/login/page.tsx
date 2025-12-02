import Avatar from "@/components/avatar";
import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen place-content-center bg-black text-white">
      <div className="max-w-[400px] mx-auto px-8 md:px-0 flex justify-center flex-col items-center gap-9">
        <Avatar />
        <LoginForm />
      </div>
    </div>
  );
}
