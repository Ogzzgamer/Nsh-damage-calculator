/**
 * 裝備模組 (Equipment Module) - 2.1 終極版
 * 職責：處理 12 槽位裝備、標籤化套裝邏輯（支援向下兼容、部位分組分流、混搭最優判定）
 */
export class EquipmentModule {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        
        // 12 個部位槽位
        this.slots = {
            "武器": "", "頭部": "", "護甲": "", "手套": "", 
            "腰帶": "", "鞋子": "", "護腕": "", "項鍊": "", 
            "戒指1": "", "戒指2": "", "飾品1": "", "飾品2": ""
        };

        /**
         * 套裝效果庫 (Set Library)
         * 支援相同標籤 (set_tag) 下區分不同的部位組合 (includeSlots)
         */
        this.setLibrary = {
            "百鍊套裝": [
                {
                    level: 115, // 映雪/機偃 (防具)
                    desc: "115級防具套裝效果",
                    includeSlots: ["頭部", "護甲", "手套", "護腕", "腰帶", "鞋子"],
                    bonuses: {
                        2: [
                            { index: 6, value: 762 },  // 首領克制 +762
                            { index: 7, value: 13.2 }  // 首領克制% +13.2%
                        ],
                        4: [
                            { index: 6, value: 789 },  // 首領克制額外 +789
                            { index: 7, value: 13.2 }  // 首領克制%額外 +13.2%
                        ]
                }
                },
                {
                    level: 115, // 流風等級 (首飾)
                    desc: "115級首飾套裝效果",
                    includeSlots: ["項鍊", "戒指1", "戒指2", "飾品1", "飾品2"],
                    bonuses: {
                        2: [
                            { index: 6, value: 762 },  // 2件套：首領克制
                            { index: 7, value: 13.2 }   // 2件套：首領克制%
                        ]
                    }
                },
                {
                    level: 113, // 機偃等級 (防具)
                    desc: "113級防具套裝效果",
                    includeSlots: ["頭部", "護甲", "手套", "護腕", "腰帶", "鞋子"],
                    bonuses: {
                        2: [{ index: 13, value: 70 }],
                        4: [{ index: 0, value: 360 }]
                    }
                }
            ]
        };
    }

    /**
     * 計算所有裝備提供的總收益
     */
    calculateStats() {
        let totalStats = new Array(15).fill(0);
        let equippedDataList = []; 

        // 1. 累加基礎屬性並收集標籤資訊
        for (const [slot, itemName] of Object.entries(this.slots)) {
            if (!itemName || itemName === "無") continue;

            const item = this.dataLoader.getEquipRawData(slot, itemName);
            if (item) {
                // 基礎屬性
                if (item.values) {
                    item.values.forEach((val, i) => {
                        totalStats[i] += (parseFloat(val) || 0);
                    });
                }

                // 收集套裝資訊
                if (item.set_tag) {
                    equippedDataList.push({
                        tag: item.set_tag,
                        level: item.level || 0,
                        slot: slot 
                    });
                }
            }
        }

        // 2. 處理套裝效果 (包含分組判定)
        this.applySetEffects(totalStats, equippedDataList);

        // 3. 處理獨珍效果
        this.applyUniquePassives(totalStats);

        return totalStats;
    }

    /**
     * 執行套裝加成邏輯 (混搭優化版)
     */
    applySetEffects(stats, equippedList) {
        console.log("--- 🕵️ 套裝判定開始 ---");

        for (const [tag, configs] of Object.entries(this.setLibrary)) {
            const myMatchItems = equippedList.filter(item => item.tag === tag);
            if (myMatchItems.length === 0) continue;

            // --- 核心修正：按部位組合分組 (區分防具與首飾) ---
            const groupMap = {};
            configs.forEach(config => {
                const gID = [...config.includeSlots].sort().join(',');
                if (!groupMap[gID]) groupMap[gID] = [];
                groupMap[gID].push(config);
            });

            // 分別判定每個部位組 (如防具組、首飾組)
            for (const [gID, groupConfigs] of Object.entries(groupMap)) {
                const sortedConfigs = [...groupConfigs].sort((a, b) => b.level - a.level);
                
                let bestT4Config = null;
                let bestT2Config = null;

                // 找 4 件套最優解 (最高等級且件數達標)
                for (const config of sortedConfigs) {
                    const count = myMatchItems.filter(item => 
                        item.level >= config.level && config.includeSlots.includes(item.slot)
                    ).length;
                    if (count >= 4) {
                        bestT4Config = config;
                        break;
                    }
                }

                // 找 2 件套最優解
                for (const config of sortedConfigs) {
                    const count = myMatchItems.filter(item => 
                        item.level >= config.level && config.includeSlots.includes(item.slot)
                    ).length;
                    if (count >= 2) {
                        bestT2Config = config;
                        break;
                    }
                }

                // 套用效果 (階梯式觸發)
                if (bestT2Config) {
                    console.log(` ✅ 觸發 【${bestT2Config.desc}】 2 件套`);
                    this.addBonus(stats, bestT2Config.bonuses[2]);
                }
                if (bestT4Config) {
                    console.log(` ✅ 觸發 【${bestT4Config.desc}】 4 件套`);
                    this.addBonus(stats, bestT4Config.bonuses[4]);
                }
            }
        }
        console.log("--- 🕵️ 套裝判定結束 ---");
    }

    /**
     * 處理屬性累加
     */
    addBonus(stats, bonusEntry) {
        if (!bonusEntry) return;
        const effects = Array.isArray(bonusEntry) ? bonusEntry : [bonusEntry];
        effects.forEach(eff => {
            stats[eff.index] += eff.value;
            console.log(`   + 屬性索引 ${eff.index} 增加 ${eff.value}`);
        });
    }

    /**
     * 處理獨珍效果 (動態轉化)
     */
    applyUniquePassives(stats) {
        const activeItemNames = Object.values(this.slots);
        activeItemNames.forEach(name => {
            if (!name) return;
            
            // 範例：柳滄海 (命中轉破防)
            if (name.includes("柳滄海")) {
                const hitValue = stats[4]; // 索引 4 是命中
                const bonus = Math.floor(hitValue / 100) * 15;
                stats[2] += bonus; // 索引 2 是破防
                console.log(` ✨ 獨珍 [柳滄海] 觸發：命中 ${hitValue} -> 破防 +${bonus}`);
            }
        });
    }

    /**
     * UI 介面獲取總屬性
     */
    getTotalStats() {
        const statsArray = this.calculateStats();
        const STAT_NAMES = [
            "攻擊", "元素攻擊", "破防", "忽視抗性", "命中", "會心", "首領克制", 
            "首領克制%", "會心傷害", "破盾", "力量", "氣海", "身法", "根骨", "耐力"
        ];
        let result = {};
        STAT_NAMES.forEach((name, index) => {
            result[name] = statsArray[index] || 0;
        });
        return result;
    }

    setEquip(slot, itemName) {
        if (this.slots.hasOwnProperty(slot)) {
            this.slots[slot] = itemName;
            return true;
        }
        return false;
    }

    clearAll() {
        Object.keys(this.slots).forEach(key => this.slots[key] = "");
    }
}