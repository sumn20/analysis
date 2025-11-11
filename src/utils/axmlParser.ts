// src/utils/axmlParser.ts
// AXML 解析工具 - 将二进制 AndroidManifest.xml 转换为普通 XML
// 改编自 axml2xml 库

const WORD_START_DOCUMENT = 0x00080003;
const WORD_STRING_TABLE = 0x001C0001;
const WORD_RES_TABLE = 0x00080180;
const WORD_START_NS = 0x00100100;
const WORD_END_NS = 0x00100101;
const WORD_START_TAG = 0x00100102;
const WORD_END_TAG = 0x00100103;
const WORD_TEXT = 0x00100104;
const WORD_EOS = 0xFFFFFFFF;
const WORD_SIZE = 4;

const TYPE_ID_REF = 0x01000008;
const TYPE_ATTR_REF = 0x02000008;
const TYPE_STRING = 0x03000008;
const TYPE_DIMEN = 0x05000008;
const TYPE_FRACTION = 0x06000008;
const TYPE_INT = 0x10000008;
const TYPE_FLOAT = 0x04000008;
const TYPE_FLAGS = 0x11000008;
const TYPE_BOOL = 0x12000008;
const TYPE_COLOR = 0x1C000008;
const TYPE_COLOR2 = 0x1D000008;

const DIMEN = ["px", "dp", "sp", "pt", "in", "mm"];

interface Attribute {
  name: string;
  namespace?: string | null;
  prefix?: string | null;
  value: string | number | boolean;
}

interface AXMLNode {
  uri: string;
  localName: string;
  qName: string;
  prefixes: Array<[string, string]>;
  attrs: Attribute[];
  children: AXMLNode[];
}

interface AxmlListener {
  startDocument?: () => void;
  endDocument?: () => void;
  startPrefixMapping?: (prefix: string, uri: string) => void;
  endPrefixMapping?: (prefix: string, uri: string) => void;
  startElement?: (uri: string, localName: string, qName: string, attrs: Attribute[]) => void;
  endElement?: (uri: string, localName: string, qName: string | null) => void;
  characterData?: (data: string) => void;
}

/**
 * 分析 AXML 文件
 * @param buf AXML 文件的 Buffer
 * @param mListener 分析过程中的监听器
 */
function analyse(buf: ArrayBuffer, mListener: AxmlListener = {}) {
  const dataView = new DataView(buf);

  // 全局变量
  let mStringsCount: number;
  // let mStylesCount: number;  // 未使用的变量
  let mStringsTable: string[];
  let mFlags: number;
  let mResCount: number;
  let mResourcesIds: number[];
  const mNamespaces = new Map<string, string>();

  let mParserOffset = 0;

  // 主循环：解析整个 AXML 文件
  while (mParserOffset < buf.byteLength) {
    const word0 = dataView.getUint32(mParserOffset, true);

    switch (word0) {
      case WORD_START_DOCUMENT:
        parseStartDocument();
        break;
      case WORD_STRING_TABLE:
        parseStringTable();
        break;
      case WORD_RES_TABLE:
        parseResourceTable();
        break;
      case WORD_START_NS:
        parseNamespace(true);
        break;
      case WORD_END_NS:
        parseNamespace(false);
        break;
      case WORD_START_TAG:
        parseStartTag();
        break;
      case WORD_END_TAG:
        parseEndTag();
        break;
      case WORD_TEXT:
        parseText();
        break;
      case WORD_EOS:
        if (mListener.endDocument) {
          mListener.endDocument();
        }
        return; // 结束解析
      default:
        mParserOffset += WORD_SIZE;
        break;
    }
  }

  if (mListener.endDocument) {
    mListener.endDocument();
  }

  // 解析文档开始标记
  function parseStartDocument() {
    if (mListener.startDocument) {
      mListener.startDocument();
    }
    mParserOffset += 2 * WORD_SIZE;
  }

  // 解析字符串表
  function parseStringTable() {
    const chunk = dataView.getUint32(mParserOffset + WORD_SIZE, true);
    mStringsCount = dataView.getUint32(mParserOffset + 2 * WORD_SIZE, true);
    // const mStylesCount = dataView.getUint32(mParserOffset + 3 * WORD_SIZE, true);  // 未使用
    mFlags = dataView.getUint32(mParserOffset + 4 * WORD_SIZE, true);
    const strOffset = mParserOffset + dataView.getUint32(mParserOffset + 5 * WORD_SIZE, true);

    mStringsTable = [];
    for (let i = 0; i < mStringsCount; i++) {
      const offset = strOffset + dataView.getUint32(mParserOffset + (i + 7) * WORD_SIZE, true);
      mStringsTable[i] = getStringFromStringTable(offset);
    }

    mParserOffset += chunk;
  }

  // 解析资源表
  function parseResourceTable() {
    const chunk = dataView.getUint32(mParserOffset + WORD_SIZE, true);
    mResCount = (chunk / 4) - 2;

    mResourcesIds = [];
    for (let i = 0; i < mResCount; i++) {
      mResourcesIds[i] = dataView.getUint32(mParserOffset + (i + 2) * WORD_SIZE, true);
    }

    mParserOffset += chunk;
  }

  // 解析命名空间
  function parseNamespace(start: boolean) {
    const prefixIdx = dataView.getUint32(mParserOffset + 4 * WORD_SIZE, true);
    const uriIdx = dataView.getUint32(mParserOffset + 5 * WORD_SIZE, true);

    const uri = getString(uriIdx);
    const prefix = getString(prefixIdx);

    if (start) {
      if (mListener.startPrefixMapping && uri && prefix) {
        mListener.startPrefixMapping(prefix, uri);
      }
      if (uri && prefix) {
        mNamespaces.set(uri, prefix);
      }
    } else {
      if (mListener.endPrefixMapping && uri && prefix) {
        mListener.endPrefixMapping(prefix, uri);
      }
      if (uri) {
        mNamespaces.delete(uri);
      }
    }

    mParserOffset += 6 * WORD_SIZE;
  }

  // 解析开始标签
  function parseStartTag() {
    const uriIdx = dataView.getUint32(mParserOffset + 4 * WORD_SIZE, true);
    const nameIdx = dataView.getUint32(mParserOffset + 5 * WORD_SIZE, true);
    const attrCount = dataView.getUint16(mParserOffset + 7 * WORD_SIZE, true);

    const name = getString(nameIdx) || '';
    let uri: string, qname: string;

    if (uriIdx === 0xFFFFFFFF) {
      uri = "";
      qname = name;
    } else {
      uri = getString(uriIdx) || "";
      if (mNamespaces.has(uri)) {
        qname = mNamespaces.get(uri) + ':' + name;
      } else {
        qname = name;
      }
    }

    mParserOffset += 9 * WORD_SIZE;

    const attrs: Attribute[] = [];
    for (let a = 0; a < attrCount; a++) {
      attrs[a] = parseAttribute();
      mParserOffset += 5 * 4;
    }

    if (mListener.startElement) {
      mListener.startElement(uri, name, qname, attrs);
    }
  }

  // 解析属性
  function parseAttribute(): Attribute {
    const attrNSIdx = dataView.getUint32(mParserOffset, true);
    const attrNameIdx = dataView.getUint32(mParserOffset + WORD_SIZE, true);
    const attrValueIdx = dataView.getUint32(mParserOffset + 2 * WORD_SIZE, true);
    const attrType = dataView.getUint32(mParserOffset + 3 * WORD_SIZE, true);
    const attrData = dataView.getUint32(mParserOffset + 4 * WORD_SIZE, true);

    const attr: Attribute = {
      name: getString(attrNameIdx) || '',
      value: '',  // 将在后面设置
    };

    if (attrNSIdx === 0xFFFFFFFF) {
      attr.namespace = null;
      attr.prefix = null;
    } else {
      const uri = getString(attrNSIdx);
      if (uri && mNamespaces.has(uri)) {
        attr.namespace = uri;
        attr.prefix = mNamespaces.get(uri) || null;
      }
    }

    if (attrValueIdx === 0xFFFFFFFF) {
      attr.value = getAttributeValue(attrType, attrData);
    } else {
      attr.value = getString(attrValueIdx) || '';
    }

    return attr;
  }

  // 解析文本
  function parseText() {
    const strIndex = dataView.getUint32(mParserOffset + 4 * WORD_SIZE, true);
    const data = getString(strIndex);
    if (mListener.characterData && data) {
      mListener.characterData(data);
    }
    mParserOffset += 7 * WORD_SIZE;
  }

  // 解析结束标签
  function parseEndTag() {
    const uriIdx = dataView.getUint32(mParserOffset + 4 * WORD_SIZE, true);
    const nameIdx = dataView.getUint32(mParserOffset + 5 * WORD_SIZE, true);

    const name = getString(nameIdx) || '';
    const uri = uriIdx === 0xFFFFFFFF ? "" : (getString(uriIdx) || "");

    if (mListener.endElement) {
      mListener.endElement(uri, name, null);
    }

    mParserOffset += 6 * WORD_SIZE;
  }

  // 获取字符串
  function getString(index: number): string | null {
    if (index >= 0 && index < mStringsCount) {
      return mStringsTable[index];
    }
    return null;
  }

  // 从字符串表获取字符串
  function getStringFromStringTable(offset: number): string {
    if (mFlags & 0x100) {
      // UTF-8 编码
      const l = dataView.getUint8(offset + 1);
      offset += 2;
      const bytes = new Uint8Array(buf, offset, l);
      return new TextDecoder('utf-8').decode(bytes);
    } else {
      // UTF-16 编码
      const l = dataView.getUint16(offset, true);
      offset += 2;
      const bytes = new Uint16Array(buf, offset, l);
      return String.fromCharCode(...Array.from(bytes));
    }
  }

  // 获取属性值
  function getAttributeValue(type: number, data: number): string | number | boolean {
    switch (type) {
      case TYPE_STRING:
        return getString(data) || '';
      case TYPE_DIMEN:
        return (data >> 8) + DIMEN[data & 0xFF];
      case TYPE_FRACTION:
        const fracValue = data / 0x7FFFFFFF;
        return fracValue.toFixed(2);
      case TYPE_FLOAT:
        const floatBuf = new ArrayBuffer(4);
        new Float32Array(floatBuf)[0] = data;
        return new Uint32Array(floatBuf)[0];
      case TYPE_INT:
      case TYPE_FLAGS:
        return data;
      case TYPE_BOOL:
        return data !== 0;
      case TYPE_COLOR:
      case TYPE_COLOR2:
        return `#${data.toString(16).toUpperCase().padStart(8, '0')}`;
      case TYPE_ID_REF:
        return `@id/0x${data.toString(16).toUpperCase().padStart(8, '0')}`;
      case TYPE_ATTR_REF:
        return `?id/0x${data.toString(16).toUpperCase().padStart(8, '0')}`;
      default:
        return `${type.toString(16).toUpperCase().padStart(8, '0')}/0x${data.toString(16).toUpperCase().padStart(8, '0')}`;
    }
  }
}

/**
 * 将 AXML 解析为树结构
 */
function parse(buf: ArrayBuffer): AXMLNode {
  const root: AXMLNode = {
    uri: '',
    localName: '',
    qName: '',
    prefixes: [],
    attrs: [],
    children: [],
  };
  const nodes: AXMLNode[] = [root];
  const prefixes: Array<Array<[string, string]>> = [[]];

  function getLatestNode() {
    return nodes[nodes.length - 1];
  }

  analyse(buf, {
    startPrefixMapping: (prefix: string, uri: string) => {
      prefixes[prefixes.length - 1].push([prefix, uri]);
    },
    endPrefixMapping: () => {
      prefixes[prefixes.length - 1].pop();
    },
    startElement: (uri: string, localName: string, qName: string, atts: Attribute[]) => {
      const node: AXMLNode = {
        uri,
        localName,
        qName,
        prefixes: [],
        attrs: atts,
        children: [],
      };
      getLatestNode().children.push(node);
      nodes.push(node);
      prefixes.push([]);
    },
    endElement: () => {
      const node = nodes.pop()!;
      prefixes.pop();
      node.prefixes = prefixes[prefixes.length - 1].slice(0);
    },
  });

  return root.children[0];
}

/**
 * 将 AXML 转换为 XML 字符串
 * @param buf AXML 文件的 ArrayBuffer
 * @returns XML 字符串
 */
export function convertAxmlToXml(buf: ArrayBuffer): string {
  const tree = parse(buf);
  const xml: string[] = [];
  xml.push('<?xml version="1.0" encoding="utf-8"?>\n');
  xml.push(printTree(tree, 0));

  function printTree(node: AXMLNode, depth: number): string {
    const buff: string[] = [];

    // 缩进
    for (let i = 0; i < depth; i++) {
      buff.push("\t");
    }

    buff.push("<", node.qName);

    // 添加命名空间前缀
    node.prefixes.forEach(prefix => {
      buff.push(" xmlns:");
      buff.push(prefix[0] + '="' + prefix[1] + '"');
    });

    // 添加属性
    node.attrs.forEach(attr => {
      buff.push(" ");
      if (attr.prefix) {
        buff.push(attr.prefix + ":");
      }
      buff.push(attr.name + '="' + attr.value + '"');
    });

    // 自闭合标签或正常标签
    if (!node.children.length) {
      buff.push(" /");
    }
    buff.push(">\n");

    // 递归处理子节点
    if (node.children.length > 0) {
      node.children.forEach(child => {
        buff.push(printTree(child, depth + 1));
      });
      for (let i = 0; i < depth; i++) {
        buff.push("\t");
      }
      buff.push("</" + node.qName + ">\n");
    }

    return buff.join('');
  }

  return xml.join('');
}

/**
 * 从 XML 字符串中提取基本信息
 */
export function extractManifestInfo(xmlText: string): {
  packageName: string;
  versionName: string;
  versionCode: number;
  minSdkVersion?: number;
  targetSdkVersion?: number;
} {
  const packageMatch = xmlText.match(/package="([^"]+)"/);
  const versionNameMatch = xmlText.match(/android:versionName="([^"]+)"/);
  const versionCodeMatch = xmlText.match(/android:versionCode="([^"]+)"/);
  const minSdkMatch = xmlText.match(/android:minSdkVersion="([^"]+)"/);
  const targetSdkMatch = xmlText.match(/android:targetSdkVersion="([^"]+)"/);

  return {
    packageName: packageMatch ? packageMatch[1] : 'Unknown',
    versionName: versionNameMatch ? versionNameMatch[1] : 'Unknown',
    versionCode: versionCodeMatch ? parseInt(versionCodeMatch[1]) : 0,
    minSdkVersion: minSdkMatch ? parseInt(minSdkMatch[1]) : undefined,
    targetSdkVersion: targetSdkMatch ? parseInt(targetSdkMatch[1]) : undefined,
  };
}

/**
 * 从 XML 字符串中提取组件列表
 */
export function extractComponents(xmlText: string): {
  activities: string[];
  services: string[];
  providers: string[];
  receivers: string[];
} {
  const activities: string[] = [];
  const services: string[] = [];
  const providers: string[] = [];
  const receivers: string[] = [];

  // 提取 Activity
  const activityRegex = /<activity[^>]*android:name="([^"]+)"/g;
  let match;
  while ((match = activityRegex.exec(xmlText)) !== null) {
    activities.push(match[1]);
  }

  // 提取 Service
  const serviceRegex = /<service[^>]*android:name="([^"]+)"/g;
  while ((match = serviceRegex.exec(xmlText)) !== null) {
    services.push(match[1]);
  }

  // 提取 Provider
  const providerRegex = /<provider[^>]*android:name="([^"]+)"/g;
  while ((match = providerRegex.exec(xmlText)) !== null) {
    providers.push(match[1]);
  }

  // 提取 Receiver
  const receiverRegex = /<receiver[^>]*android:name="([^"]+)"/g;
  while ((match = receiverRegex.exec(xmlText)) !== null) {
    receivers.push(match[1]);
  }

  return { activities, services, providers, receivers };
}
