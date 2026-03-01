/**
 * 職業模組 (Profession Module)
 * 職責：處理 8 大職業的五維轉換公式、內外功判定及主屬性收益。
 */
export class ProfessionModule {
    constructor() {
        // 預設職業
        this.currentMain = "神相";
        this.currentSub = "無";

        // 1. 職業類型定義 (決定主屬性)
        this.PROF_TYPES = {
            "內功": ["神相", "九靈", "龍吟", "素問"],
            "外功": ["碎夢", "玄機", "血河", "鐵衣"]
        };

        // 2. 通用基礎轉換 (全職業力量/氣海基礎收益)
        // 注意：實務上內功職不堆力量，外功職不堆氣海，但底層公式仍保留基礎值以防萬一
        this.COMMON_TRANS = {
            "力量": { attack: 4.65, break: 2 },
            "氣海": { attack: 4.65, break: 2 },
            "身法": { hit: 1.6, crit: 1.6 },
            "根骨": { health: 26.7 },
            "耐力": { defense: 20 }
        };

        // 3. 職業特色收益 (額外加成，會與通用轉換疊加)
        this.SPECIAL_TRANS = {
            "神相": { "氣海": { hit: 0.83 } },
            "九靈": { "耐力": { attack: 1.65 } },
            "素問": { "氣海": { qidun: 2.5 } }, 
            "龍吟": { "根骨": { break: 2 } },
            "鐵衣": { "耐力": { health: 26.7 } },
            "碎夢": { "身法": { crit: 0.6, block: 0.33 } }, 
            "玄機": { "身法": { element: 1.07 } },
            "血河": { "根骨": { attack: 1.65 } }
        };
    }

    /**
     * Getter: 獲取當前職業的主屬性名稱
     * @returns {string} "氣海" 或 "力量"
     */
    get mainStat() {
        if (this.PROF_TYPES["內功"].includes(this.currentMain)) {
            return "氣海";
        }
        if (this.PROF_TYPES["外功"].includes(this.currentMain)) {
            return "力量";
        }
        return "氣海"; // 預設值
    }

    /**
     * Getter: 獲取當前職業的傷害類型
     * @returns {string} "內功" 或 "外功"
     */
    get damageType() {
        return this.PROF_TYPES["內功"].includes(this.currentMain) ? "內功" : "外功";
    }

    /**
     * 獲取職業 110 級基礎五維白字
     */
    getBaseStats() {
        // 這裡可以根據職業微調初始值，目前設定為標準模板
        return {
            "力量": 150,
            "氣海": 150,
            "身法": 120,
            "根骨": 100,
            "耐力": 100
        };
    }

    /**
     * 執行屬性轉換 (由 DamageEngine 調用)
     * @param {Object} finalPanel - 傳入包含 15 維屬性的物件
     */
    applyConversion(finalPanel) {
        const primaryAttrs = ["力量", "氣海", "身法", "根骨", "耐力"];
        const myMainStat = this.mainStat;

        primaryAttrs.forEach(attr => {
            const val = finalPanel[attr] || 0;
            if (val <= 0) return;

            // --- 重要：排他性收益邏輯 ---
            // 如果目前是內功職業，力量產生的「攻擊」與「破防」收益在遊戲中極低或不計。
            // 這裡模擬真實情況：非主屬性僅提供極少量基礎攻擊，甚至為零。
            const isWrongStat = (attr === "力量" || attr === "氣海") && attr !== myMainStat;

            // Step 1: 應用通用轉換
            const common = this.COMMON_TRANS[attr];
            if (common) {
                // 如果是錯誤的屬性（如神相堆力量），攻擊收益降權 (甚至可設為 0)
                const multiplier = isWrongStat ? 0 : 1; 
                
                if (common.attack) finalPanel["攻擊"] += val * common.attack * multiplier;
                if (common.break) finalPanel["破防"] += val * common.break * multiplier;
                
                // 身法、根骨、耐力收益不受主屬性影響
                if (!isWrongStat) {
                    if (common.hit) finalPanel["命中"] += val * common.hit;
                    if (common.crit) finalPanel["會心"] += val * common.crit;
                    if (common.health) finalPanel["血量"] = (finalPanel["血量"] || 0) + val * common.health;
                    if (common.defense) finalPanel["防禦"] = (finalPanel["防禦"] || 0) + val * common.defense;
                }
            }

            // Step 2: 應用主職業特色轉換
            this._applySpecial(finalPanel, attr, val, this.currentMain);

            // Step 3: 應用潛學特色轉換
            if (this.currentSub !== "無" && this.currentSub !== this.currentMain) {
                this._applySpecial(finalPanel, attr, val, this.currentSub);
            }
        });

        return finalPanel;
    }

    /**
     * 內部輔助：應用職業特色轉換
     */
    _applySpecial(panel, attr, val, profName) {
        const specialConfig = this.SPECIAL_TRANS[profName];
        if (specialConfig && specialConfig[attr]) {
            const bonus = specialConfig[attr];
            if (bonus.attack) panel["攻擊"] += val * bonus.attack;
            if (bonus.break) panel["破防"] += val * bonus.break;
            if (bonus.hit) panel["命中"] += val * bonus.hit;
            if (bonus.crit) panel["會心"] += val * bonus.crit;
            if (bonus.element) panel["元素攻擊"] += val * bonus.element;
            if (bonus.qidun) panel["氣盾"] = (panel["氣盾"] || 0) + val * bonus.qidun;
        }
    }

    /**
     * 設定職業
     * @param {string} main - 主職名稱
     * @param {string} sub - 潛學職名稱
     */
    setProfession(main, sub) {
        if (this.SPECIAL_TRANS[main] || this.PROF_TYPES["內功"].concat(this.PROF_TYPES["外功"]).includes(main)) {
            this.currentMain = main;
            this.currentSub = sub || "無";
            return true;
        }
        return false;
    }
}