import { describe, expect, test } from "vitest"
import { processTextForImagesAndLinks } from "../src/core/stream"

describe("stream text processing", () => {
  test("keeps image URLs at their text position", () => {
    const parts = processTextForImagesAndLinks(
      [
        "1. *Áo sơ mi nam*",
        "- *Giá:* 340.000đ",
        "https://cdn.example.com/white-shirt.jpg",
        "",
        "2. *Áo thun Navy*",
        "- *Giá:* 230.000đ",
        "https://cdn.example.com/navy-shirt.png",
      ].join("\n"),
    )

    expect(parts).toEqual([
      "1. Áo sơ mi nam\n- Giá: 340.000đ",
      "https://cdn.example.com/white-shirt.jpg",
      "2. Áo thun Navy\n- Giá: 230.000đ",
      "https://cdn.example.com/navy-shirt.png",
    ])
  })

  test("removes markdown emphasis from text parts", () => {
    const parts = processTextForImagesAndLinks(
      "1. **Áo sơ mi nam**\n- *Giá:* 340.000đ",
    )

    expect(parts).toEqual(["1. Áo sơ mi nam\n- Giá: 340.000đ"])
  })

  test("treats product image storage URLs without extensions as image parts", () => {
    const imageUrl =
      "https://pub-14221f8ad4874b94b0ef19245417de59.r2.dev/public/space/11722811/products/images/gJXdFfMoTOot55yUbUQFI791172561080"
    const parts = processTextForImagesAndLinks(
      ["মূল্য: ৪৪৫০ (USD)", "- ছবি:", imageUrl].join("\n"),
    )

    expect(parts).toEqual(["মূল্য: ৪৪৫০ (USD)", imageUrl])
  })
})
