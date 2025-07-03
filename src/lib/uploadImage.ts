
import axios from 'axios';
import * as cheerio from 'cheerio';
import FormData from 'form-data';

export default async function imgbb(buffer: Buffer): Promise<string | null> {
  try {
    const { data: rawData } = await axios.get('https://imgbb.com');
    const $ = cheerio.load(rawData);

    const script = $('script')
      .map((i, el) => $(el).html())
      .get()
      .find(text => text && text.includes('auth_token'));

    const match = script?.match(/auth_token\s*[:=]\s*["']([a-zA-Z0-9]{32,})["']/);
    const token = match ? match[1] : null;

    const form = new FormData();
    form.append('source', buffer, {
      filename: Date.now() + '.jpg',
      contentType: 'image/jpeg'
    });
    form.append('type', 'file');
    form.append('action', 'upload');
    form.append('timestamp', Date.now());
    form.append('auth_token', token);

    const { data } = await axios.post('https://imgbb.com/json', form, {
      headers: {
        ...form.getHeaders()
      }
    });
    return data.image.url;
  } catch {
    return null;
  }
}