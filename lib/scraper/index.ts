import axios from "axios";
import * as cheerio from "cheerio";
import { extractCurrency, extractDescription, extractPrice, returnNum, returnUnique } from "../utils";

export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  //BrightData proxy configuration
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: `brd.superproxy.io`,
    port,
    rejectUnauthorized: false,
  };

  try {
    //Fetch product page
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    //Extract the product title
    const title = $(`#productTitle`).text().trim();
    const currentPrice = extractPrice(
      $(".priceToPay span.a-price-whole"),
      $("span.a-price-fraction"),
      $("a.size.base.a-color-price"),
      $(".a-button-selected .a-color-base")
    );

    const originalPrice = extractPrice(
      $("#priceblock_ourprice"),
      $(".a-price.a-text-price span.a-offscreen"),
      $("#listPrice"),
      $("#priceblock_dealprice"),
      $(".a-size-base.a-color-price")
    );

    const outOfStock =
      $(`#availability span`).text().trim().toLowerCase() ===
      "currently unavailable";

    const images =
      $("#imgBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image") ||
      "{}";

    const imageUrls = Object.keys(JSON.parse(images));

    const currency = extractCurrency($(".a-price-symbol"));
    const discountRate = returnUnique($('#savingsPercentage').text().replace(/[-%]/g, ""))
    const reviews = returnNum($('[data-hook="total-review-count"]').text().trim())
    const description = $('#feature-bullets').text().trim()
    const ratings = parseFloat($('#acrCustomerReviewText').text().trim())


    //Construct data object with scraped information
    const data = {
        url, 
        currency: currency || '$',
        image: imageUrls[0],
        title,
        currentPrice: Number(currentPrice) || Number(originalPrice),
        originalPrice: Number(originalPrice) || Number(currentPrice),
        priceHistory: [],
        discountRate: Number(discountRate),
        category: 'category',
        reviewsCount: reviews,
        stars: ratings,
        isOutOfStock: outOfStock,
        description: description,
        lowestPrice: Number(currentPrice) || Number(originalPrice),
        highestPrice: Number(originalPrice) || Number(currentPrice),
        averagePrice: Number(currentPrice) || Number(originalPrice),
    }

    return data


  } catch (error: any) {
    throw new Error(`Failed to scrape product: ${error.message}`);
  }
}
