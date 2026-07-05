/**
 * 数据云端同步服务
 * 
 * 方案：利用 GitHub 仓库的 data.json 文件存储数据
 * - 读取：公开仓库直接 fetch，无需认证
 * - 写入：通过 GitHub Contents API，需要 PAT token
 * - localStorage 作为本地缓存，减少网络请求
 */

const GITHUB_REPO = 'Shea1992/family-ui';
const DATA_FILE_PATH = 'data.json';
const DATA_BRANCH = 'dist';
const PAT_STORAGE_KEY = 'family-pat-token';

// 获取存储的 PAT
export function getStoredPAT(): string {
  return localStorage.getItem(PAT_STORAGE_KEY) || '';
}

// 存储 PAT
export function storePAT(token: string): void {
  localStorage.setItem(PAT_STORAGE_KEY, token);
}

// 清除 PAT
export function clearPAT(): void {
  localStorage.removeItem(PAT_STORAGE_KEY);
}

// 从云端加载数据
export async function loadFromCloud(): Promise<{
  members: any[];
  relations: any[];
  customRelationTypes: any[];
} | null> {
  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/${DATA_BRANCH}/${DATA_FILE_PATH}`;
    const resp = await fetch(url, {
      cache: 'no-cache',
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) {
      if (resp.status === 404) return null; // 文件不存在，首次使用
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (data.members || data.relations || data.customRelationTypes) {
      return {
        members: data.members || [],
        relations: data.relations || [],
        customRelationTypes: data.customRelationTypes || [],
      };
    }
    return null;
  } catch (e) {
    console.warn('从云端加载数据失败:', e);
    return null;
  }
}

// 保存数据到云端
export async function saveToCloud(
  data: { members: any[]; relations: any[]; customRelationTypes: any[] },
  pat?: string
): Promise<{ success: boolean; error?: string }> {
  const token = pat || getStoredPAT();
  if (!token) {
    return { success: false, error: '未设置 PAT token，无法保存到云端' };
  }

  try {
    // 1. 获取当前文件的 SHA（用于更新）
    let fileSha: string | undefined;
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_FILE_PATH}?ref=${DATA_BRANCH}`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      if (resp.ok) {
        const info = await resp.json();
        fileSha = info.sha;
      }
    } catch {
      // 文件不存在，无需 SHA
    }

    // 2. 准备上传内容
    const content = JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      members: data.members,
      relations: data.relations,
      customRelationTypes: data.customRelationTypes,
    }, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(content)));

    // 3. 通过 Contents API 写入
    const body: Record<string, any> = {
      message: `data: update ${new Date().toISOString().slice(0, 19)}`,
      content: base64Content,
      branch: DATA_BRANCH,
    };
    if (fileSha) {
      body.sha = fileSha;
    }

    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      const errMsg = errData.message || `HTTP ${resp.status}`;
      if (errMsg.includes('rate limit')) {
        return { success: false, error: 'API 调用次数超限，请稍后再试' };
      }
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || '网络错误' };
  }
}

// 检查云端是否有数据
export async function checkCloudData(): Promise<boolean> {
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_FILE_PATH}?ref=${DATA_BRANCH}`;
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    return resp.ok;
  } catch {
    return false;
  }
}
