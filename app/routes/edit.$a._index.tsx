import { LoaderFunctionArgs, redirect } from "@remix-run/node";

export const loader  = async ({ request }: LoaderFunctionArgs) => {
    return redirect("/");
  };
  