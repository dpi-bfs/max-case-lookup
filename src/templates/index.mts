import fs from "fs";
import util from "util";
import path from "path";
import Mustache from "mustache";
import juice from "juice";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readFileAsync = util.promisify(fs.readFile);

async function generateHtml(params: Record<string, any>, templateName: string): Promise<string> {
  try {
    console.log('params', params);
    const templatePath = path.join(__dirname, templateName);
    console.log('templatePath', templatePath);
    let html;
    try {
      html = await readFileAsync(templatePath, "utf8");
      console.log("Successfully read template file.");
    } catch (readErr) {
      console.error("Error reading template file:", readErr);
      throw readErr;
    }
    const renderedHtml = Mustache.render(html, params);
    if (!renderedHtml) {
      throw new Error("Rendered HTML is undefined.");
    }
    return juice(renderedHtml);
  } catch (error) {
    console.error(`Error generating HTML from template "${templateName}":`, error);
    throw error;
  }
}

export let generateEmailBusinessHtml = (params: Record<string, any>) => generateHtml(params, "emailBusinessPlain.mustache");

