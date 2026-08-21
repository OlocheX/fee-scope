import { createServerFn } from "@tanstack/react-start";
import { collectChainFees } from "./fees.server";

export const getChainFees = createServerFn({ method: "GET" }).handler(async () => {
  return collectChainFees();
});
