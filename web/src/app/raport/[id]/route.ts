import { redirect } from "next/navigation"

export async function GET(_request: Request, ctx: RouteContext<"/raport/[id]">) {
  const { id } = await ctx.params
  redirect(`/api/analyses/${encodeURIComponent(decodeURIComponent(id))}/pdf?inline=1`)
}
