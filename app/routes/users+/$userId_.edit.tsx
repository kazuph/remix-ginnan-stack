import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { getApiClient } from "~/lib/client";
import { createSupabaseServerClient } from "~/supabase.server";

export const meta: MetaFunction = () => {
  return [{ title: "プロフィール編集" }, { name: "description", content: "ユーザー情報の編集" }];
};

interface ApiUser {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

type ApiUserResponse = ApiUser | ApiError;

function isApiError(response: unknown): response is ApiError {
  return typeof response === "object" && response !== null && "code" in response;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const userId = params.userId;
  if (!userId) {
    throw new Error("User ID is required");
  }

  const { client } = createSupabaseServerClient(request, context);
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error("Unauthorized");
  }

  const apiClient = getApiClient(context, request);
  const userResponse = await apiClient.api.users[":userId"].$get({
    param: { userId },
  });
  const userData: unknown = await userResponse.json();

  if (isApiError(userData)) {
    if (userData.code === "NotFoundError") {
      return redirect("/complete-profile", {
        headers: {
          "Set-Cookie": request.headers.get("Cookie") || "",
        },
      });
    }
    throw new Error(userData.message);
  }

  return { pageUser: userData as ApiUser };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const bio = formData.get("bio") as string;
  const userId = params.userId;

  if (!userId) {
    throw new Error("User ID is required");
  }

  const { client } = createSupabaseServerClient(request, context);
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error("Unauthorized");
  }

  const apiClient = getApiClient(context, request);
  try {
    const response = await apiClient.api.users[":userId"].$patch({
      param: { userId },
      json: { name, bio },
    });

    const responseData: unknown = await response.json();

    if (!response.ok) {
      if (isApiError(responseData)) {
        return { error: responseData.message };
      }
      return { error: "Failed to update profile" };
    }

    if (isApiError(responseData)) {
      return { error: responseData.message };
    }

    return redirect(`/users/${userId}`);
  } catch (error) {
    console.error("Error updating user:", error);
    return { error: error instanceof Error ? error.message : "Failed to update profile" };
  }
}

export default function UserEdit() {
  const { pageUser } = useLoaderData<typeof loader>();

  return (
    <div className="p-8">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">プロフィール編集</h1>
        <Form method="post" className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              名前
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={pageUser.name}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              自己紹介
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={5}
              defaultValue={pageUser.bio || ""}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
            />
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => window.history.back()}>
              キャンセル
            </Button>
            <Button type="submit">更新する</Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
