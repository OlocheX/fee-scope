import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lookup } from "./lookup.server";

export const lookupQuery = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ q: z.string() }).parse(data))
  .handler(async ({ data }) => {
    return lookup(data.q.slice(0, 120));
  });
