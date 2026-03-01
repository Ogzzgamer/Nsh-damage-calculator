/**
 * Boss 模組 (Boss Module)
 * 職責：從 DataLoader 的 "boss" 節點提取特定 Boss 的屬性與計算係數
 */
export class BossModule {
    /**
     * @param {DataLoader} dataLoader - 已初始化的數據加載器
     */
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.target = ""; // 儲存當前選中的 Boss 名稱
        
        // 基礎安全數據：僅在數據源徹底失效時使用
        this.defaultStats = {
            stats: {
                defense: 4000,
                elemental_resist: 70,
                block: 800,
                crit_resist: 500,
                defense_base: 1500,
                shield_base: 480
            },
            coeffs: {
                defK: 2860,
                critK: 1600,
                hitK: 1200,
                eleK: 250
            }
        };
    }

    /**
     * 設定目標 Boss
     * @param {string} name - Boss 名稱 (需匹配 JSON 中的 Key)
     */
    setTarget(name) {
        if (name) {
            this.target = name;
            console.log(`BossModule: 目標已設定為 [${name}]`);
        }
    }

    /**
     * 獲取當前 Boss 數據
     * 關鍵修正：直接指向 dataLoader.data.boss 層級
     */
    getStats() {
        // 💡 根據 Console 調查結果，JSON 內容被掛載在 .boss 之下
        const allBossData = this.dataLoader.data?.boss;
        
        if (!allBossData || typeof allBossData !== 'object') {
            console.warn("⚠️ BossModule: 在 dataLoader.data.boss 找不到數據，請檢查加載器。");
            return this.defaultStats;
        }

        // 1. 如果尚未設定 target，或 target 不存在於目前數據中，自動修正為第一個可選 Boss
        if (!this.target || !allBossData[this.target]) {
            const names = Object.keys(allBossData);
            if (names.length > 0) {
                this.target = names[0];
            } else {
                return this.defaultStats;
            }
        }

        const boss = allBossData[this.target];

        // 2. 輸出偵測 (Debug 用，確認抓到的是否為 JSON 數據)
        if (boss.coeffs?.defK === 2860) {
            console.log(`✅ BossModule: 成功讀取 JSON 數據 [${this.target}] (defK: 2860)`);
        }

        // 3. 回傳標準化結構
        return {
            name: this.target,
            stats: {
                defense: boss.stats?.defense ?? this.defaultStats.stats.defense,
                elemental_resist: boss.stats?.elemental_resist ?? this.defaultStats.stats.elemental_resist,
                block: boss.stats?.block ?? this.defaultStats.stats.block,
                crit_resist: boss.stats?.crit_resist ?? this.defaultStats.stats.crit_resist,
                defense_base: boss.stats?.defense_base ?? this.defaultStats.stats.defense_base,
                shield_base: boss.stats?.shield_base ?? this.defaultStats.stats.shield_base
            },
            coeffs: {
                defK: boss.coeffs?.defK ?? this.defaultStats.coeffs.defK,
                critK: boss.coeffs?.critK ?? this.defaultStats.coeffs.critK,
                hitK: boss.coeffs?.hitK ?? this.defaultStats.coeffs.hitK,
                eleK: boss.coeffs?.eleK ?? this.defaultStats.coeffs.eleK
            }
        };
    }

    /**
     * 獲取所有 Boss 名稱列表
     * @returns {string[]}
     */
    getBossList() {
        // 確保從 .boss 節點抓取列表
        const source = this.dataLoader.data?.boss || {};
        return Object.keys(source);
    }
}