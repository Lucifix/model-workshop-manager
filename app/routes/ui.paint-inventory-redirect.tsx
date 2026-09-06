import { redirect } from "react-router";

export async function loader() {
  return redirect("/paints?filter=owned");
}
