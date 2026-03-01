/**
 * 內功模組 (Inner Power Module)
 * 職責：管理 6 個內功槽位，處理 28 種詞條轉換，並計算「靈韻」對被動效果的加成
 */
export class InnerPowerModule {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        
        // 初始化 6 個槽位
        this.slots = Array.from({ length: 6 }, () => ({
            type: "無",
            subStats: Array.from({ length: 7 }, () => ({ name: "無", value: 0 }))
        }));

        // 核心 15 維屬性索引映射
        this.CORE_INDEX = {
            ATTACK: 0, ELEMENT: 1, BREAK: 2, IGNORE: 3, HIT: 4, 
            CRIT: 5, BOSS_SUB: 6, BOSS_SUB_PCT: 7, CRIT_DMG: 8, SHIELD_BREAK: 9,
            STR: 10, QIHAI: 11, DEX: 12, CON: 13, END: 14
        };
    }

    /**
     * 【對接口】供 DamageEngine.js 調用
     */
    getTotalStats() {
        const { totalStats, multipliers, all28Stats } = this.calculateStats();
        
        const STAT_NAMES = [
            "攻擊", "元素攻擊", "破防", "忽視抗性", "命中", "會心", "首領克制", 
            "首領克制%", "會心傷害", "破盾", "力量", "氣海", "身法", "根骨", "耐力"
        ];
        
        // 1. 建立 15 維核心面板結果
        let result = {};
        STAT_NAMES.forEach((name, index) => {
            result[name] = totalStats[index] || 0;
        });

        // 2. 掛載完整的 28 種屬性原始數據與倍率
        result.raw28 = all28Stats; 
        result.multipliers = multipliers; 

        return result;
    }

    setInnerPower(index, data) {
        if (index >= 0 && index < 6) {
            this.slots[index] = data;
        }
    }

    updateSlot(index, data) {
        this.setInnerPower(index, data);
    }

    /**
     * 核心轉換邏輯：處理全部 28 種詞條
     */
    convertAndAccumulate(name, value, stats, allMap) {
        const v = parseFloat(value || 0);
        if (v === 0 || name === "無" || name === "靈韻") return;

        // 💡 關鍵更動：確保所有傳入的詞條名稱都被記錄在 allMap 中
        allMap[name] = (allMap[name] || 0) + v;

        // 處理 15 維核心面板的映射
        switch (name) {
            case "攻擊":
                stats[this.CORE_INDEX.ATTACK] += v;
                break;
            case "最大攻擊":
                stats[this.CORE_INDEX.ATTACK] += v / 2;
                break;
            case "最小攻擊":
                // 遊戲邏輯：大小攻擊平均值計入面板攻擊
                stats[this.CORE_INDEX.ATTACK] += v / 2;
                break;
            case "元素攻擊":
                stats[this.CORE_INDEX.ELEMENT] += v;
                break;
            case "破防":
                stats[this.CORE_INDEX.BREAK] += v;
                break;
            case "命中":
                stats[this.CORE_INDEX.HIT] += v;
                break;
            case "會心":
                stats[this.CORE_INDEX.CRIT] += v;
                break;
            case "首領克制":
                stats[this.CORE_INDEX.BOSS_SUB] += v;
                break;
            case "會心傷害":
                stats[this.CORE_INDEX.CRIT_DMG] += v;
                break;
            case "破盾":
                stats[this.CORE_INDEX.SHIELD_BREAK] += v;
                break;
            case "力量": stats[this.CORE_INDEX.STR] += v; break;
            case "氣海": stats[this.CORE_INDEX.QIHAI] += v; break;
            case "身法": stats[this.CORE_INDEX.DEX] += v; break;
            case "根骨": stats[this.CORE_INDEX.CON] += v; break;
            case "耐力": stats[this.CORE_INDEX.END] += v; break;
            default: 
                // 其他如：流派克制、防禦、氣盾等，已由上面的 allMap[name] 記錄
                break;
        }
    }

    /**
     * 計算總收益
     */
    calculateStats() {
        let totalStats = new Array(15).fill(0);
        let all28Stats = {}; 
        let multipliers = { attackPct: 0, damagePct: 0 };

        this.slots.forEach(slot => {
            if (!slot || slot.type === "無") return;

            // 判斷該內功是否有靈韻詞條
            const hasLingYun = slot.subStats && slot.subStats.some(s => s.name === "靈韻");
            const lingYunMult = hasLingYun ? 1.25 : 1.0;

            // 1. 處理 7 個隨機詞條 (不吃靈韻加成)
            slot.subStats.forEach(stat => {
                this.convertAndAccumulate(stat.name, stat.value, totalStats, all28Stats);
            });

            // 2. 處理內功種類被動效果 (吃靈韻加成)
            const innerInfo = this.dataLoader.getInnerPowerEffect(slot.type);
            if (innerInfo && innerInfo.effect) {
                const eff = innerInfo.effect;
                
                // 百分比類 (如：破釜、日月)
                if (eff.ATTACK_PCT) multipliers.attackPct += eff.ATTACK_PCT * lingYunMult;
                if (eff.DAMAGE_BONUS_PCT) multipliers.damagePct += eff.DAMAGE_BONUS_PCT * lingYunMult;

                // 固定數值類 (計入 15 維面板)
                if (eff.ATTACK_FIXED) totalStats[this.CORE_INDEX.ATTACK] += eff.ATTACK_FIXED * lingYunMult;
                if (eff.ELEMENT_ATTACK) totalStats[this.CORE_INDEX.ELEMENT] += eff.ELEMENT_ATTACK * lingYunMult;
                if (eff.IGNORE_RESIST) totalStats[this.CORE_INDEX.IGNORE] += eff.IGNORE_RESIST * lingYunMult;
                if (eff.HIT_FIXED) totalStats[this.CORE_INDEX.HIT] += eff.HIT_FIXED * lingYunMult;
                if (eff.BOSS_SUPPRESSION_PCT) totalStats[this.CORE_INDEX.BOSS_SUB_PCT] += eff.BOSS_SUPPRESSION_PCT * lingYunMult;
                if (eff.CRIT_DAMAGE_PCT) totalStats[this.CORE_INDEX.CRIT_DMG] += eff.CRIT_DAMAGE_PCT * lingYunMult;
            }
        });

        return { totalStats, multipliers, all28Stats };
    }
}