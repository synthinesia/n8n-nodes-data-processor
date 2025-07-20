import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import cheerio from 'cheerio';
import * as description from './HtmlDataExtractorNode.node.json';

interface HtmlNode { tag: string; id?: string; classes: string[]; value?: string; origin: string; children: HtmlNode[]; }

export class HtmlDataExtractorNode implements INodeType {
	/**
	 * The description of the node.
	 */
	description: INodeTypeDescription = description as INodeTypeDescription;

	/**
	 * Executes the node logic.
	 *
	 * @returns {Promise<INodeExecutionData[][]>} The output data.
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnItems: INodeExecutionData[] = [];

		/*
		 * Loop through each input item and extract HTML data.
		 * Each item is expected to have an HTML string in the specified input field.
		 */
    for (let i = 0; i < items.length; i++) {
      const inputField = this.getNodeParameter('inputField', i) as string;
      const maxDepth = this.getNodeParameter('maxDepth', i) as number;
      const html = items[i].json[inputField] as string;

      const $ = cheerio.load(html);
      const parseElem = (elem: any , depth: number): HtmlNode => ({
        tag: elem.tagName,
        id: elem.attribs.id || undefined,
        classes: (elem.attribs.class || '').split(/\s+/).filter(Boolean),
        value: $(elem).contents().filter((_, e) => e.type === 'text').text().trim() || undefined,
        origin: $.html(elem),
        children: depth < maxDepth
          ? $(elem).children().map((_, e) => parseElem(e, depth + 1)).get()
          : []
      });

      const roots = $('body').children().toArray().map(e => parseElem(e, 1));
      returnItems.push({ json: { parsed: roots } });
    }

    return this.prepareOutputData(returnItems);
  }
}
