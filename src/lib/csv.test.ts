import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv(["a", "b"], [["x, y", 'say "hi"'], ["line\nbreak", null]])).toBe(
      'a,b\r\n"x, y","say ""hi"""\r\n"line\nbreak",\r\n'
    );
  });

  it("neutralises formula-looking text but not numbers", () => {
    expect(toCsv(["v"], [["=HYPERLINK(1)"], ["-25rb kopi"], [-5], [1500.5]])).toBe(
      "v\r\n'=HYPERLINK(1)\r\n'-25rb kopi\r\n-5\r\n1500.5\r\n"
    );
  });
});
