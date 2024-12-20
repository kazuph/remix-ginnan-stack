import { type ActionFunctionArgs, redirect } from "@remix-run/cloudflare";
import { Form } from "@remix-run/react";
import { signInWithGoogle } from "~/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const provider = formData.get("provider");

  if (provider === "google") {
    const { error, data, headers } = await signInWithGoogle(request, context);

    if (!error && data?.url) {
      return redirect(data.url, { headers });
    }
    return { error: error || "アカウント作成に失敗しました" };
  }

  return { error: "Invalid provider" };
}

export default function Signup() {
  return (
    <>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">アカウント作成</h2>
      <Form method="post" action="/signup" className="mt-8 space-y-6">
        <input type="hidden" name="provider" value="google" />
        <div>
          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Googleでアカウント作成
          </button>
        </div>
      </Form>
    </>
  );
}
