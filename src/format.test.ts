import { describe, expect, it } from "vitest";
import { caretAfterDigits, cleanNumberText, groupThousands } from "./format";

describe("cleanNumberText", () => {
  it("strips commas, letters and signs", () => {
    expect(cleanNumberText("1,2a34", 0)).toBe("1234");
    expect(cleanNumberText("-500", 0)).toBe("500");
  });
  it("keeps only the first decimal point and limits decimals", () => {
    expect(cleanNumberText("12.345.6", 2)).toBe("12.34");
  });
  it("drops the decimal point entirely when no decimals are allowed", () => {
    expect(cleanNumberText("12.5", 0)).toBe("125");
  });
  it("keeps a trailing point so the user can keep typing decimals", () => {
    expect(cleanNumberText("12.", 2)).toBe("12.");
  });
  it("returns empty text for empty input", () => {
    expect(cleanNumberText("", 2)).toBe("");
  });
});

describe("groupThousands", () => {
  it("adds commas to the integer part", () => {
    expect(groupThousands("400000")).toBe("400,000");
    expect(groupThousands("1234567")).toBe("1,234,567");
    expect(groupThousands("999")).toBe("999");
  });
  it("leaves the decimal part (and a trailing point) alone", () => {
    expect(groupThousands("1234.5")).toBe("1,234.5");
    expect(groupThousands("1234.")).toBe("1,234.");
  });
  it("handles empty and decimal-only text", () => {
    expect(groupThousands("")).toBe("");
    expect(groupThousands(".5")).toBe(".5");
  });
});

describe("caretAfterDigits", () => {
  it("places the caret after the nth digit, skipping inserted commas", () => {
    // "1,234,567": 4 digits typed before the caret -> after "1,234"
    expect(caretAfterDigits("1,234,567", 4)).toBe(5);
    expect(caretAfterDigits("1,234,567", 1)).toBe(1);
  });
  it("counts the decimal point as a typed character", () => {
    expect(caretAfterDigits("1,234.5", 5)).toBe(6);
  });
  it("handles start and end", () => {
    expect(caretAfterDigits("400,000", 0)).toBe(0);
    expect(caretAfterDigits("400,000", 6)).toBe(7);
  });
});
