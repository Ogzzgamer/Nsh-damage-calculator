/**
 * 儲存與載入模塊 (Storage Module) - 增強版
 * 具備：增刪改查、匯出 JSON、匯入 JSON
 */
export class StorageModule {
    constructor(storageKey = 'saved_panels') {
        this.storageKey = storageKey;
    }

    // 取得所有存檔
    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        } catch (e) {
            console.error("存檔解析失敗", e);
            return [];
        }
    }

    // 儲存新配置
    save(name, yieldVal, snapshot) {
        const saved = this.getAll();
        const newConfig = {
            id: Date.now(),
            name: name || "未命名配置",
            yield: yieldVal,
            snapshot: snapshot
        };
        saved.push(newConfig);
        localStorage.setItem(this.storageKey, JSON.stringify(saved));
        return newConfig;
    }

    // 刪除存檔
    delete(id) {
        const saved = this.getAll().filter(item => item.id != id);
        localStorage.setItem(this.storageKey, JSON.stringify(saved));
    }

    // 取得單一存檔
    getById(id) {
        return this.getAll().find(item => item.id == id);
    }

    // --- 匯出功能 ---
    exportToFile() {
        const data = localStorage.getItem(this.storageKey);
        if (!data || data === '[]') {
            alert("目前沒有任何存檔可以匯出！");
            return;
        }
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `逆水寒配裝備份_${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // --- 匯入功能 ---
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (!Array.isArray(importedData)) throw new Error("無效的數據格式");
                    
                    // 這裡可以選擇：A. 覆蓋現有存檔  B. 合併現有存檔
                    // 這裡我們採用「合併」並過濾重複 ID
                    const currentData = this.getAll();
                    const combined = [...currentData, ...importedData];
                    
                    // 簡單去重
                    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                    
                    localStorage.setItem(this.storageKey, JSON.stringify(unique));
                    resolve(unique);
                } catch (err) {
                    reject("匯入失敗：檔案格式錯誤");
                }
            };
            reader.readAsText(file);
        });
    }
}