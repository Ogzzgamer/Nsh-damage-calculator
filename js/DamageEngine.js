/**
 * 傷害計算引擎 (Damage Engine)
 * 核心邏輯：五維屬性彙整、職業特色轉化、雙曲擬合收益計算
 */
export const DamageEngine = {
    /**
     * 執行最終傷害期待值運算
     * @param {Object} prof - 職業模組 (ProfessionModule 實例)
     * @param {Object} equip - 裝備模組
     * @param {Object} inner - 內功模組
     * @param {Object} boss - Boss 模組
     */
    calculate(prof, equip, inner, boss) {
        // 1. 獲取彙整後的最終面板 (此步會呼叫 prof.applyConversion 處理轉化)
        const p = this.getFinalPanel(prof, equip, inner);
        
        // 2. 獲取 Boss 數據與係數
        const bossData = boss.getStats(); 
        if (!bossData || !bossData.stats || !bossData.coeffs) {
            return { yield: 0, panel: this.convertMapToArray(p), details: {} };
        }

        const s = bossData.stats;   // defense, elemental_resist, block, crit_resist
        const K = bossData.coeffs;  // defK, eleK, hitK, critK
        
        // 面板參考倍率 (通常為 1.0，可用於模擬不同技能)
        const SkillCoef = 1.0; 

        // --- 1. 物理區 (Physical Zone) ---
        // 公式：(攻擊 + 首領克制 - Boss抵禦) * 破防穿透率
        const bossResist = s.defense_base || 0;
        const netAttack = p["攻擊"] + p["首領克制"] - bossResist;
        const totalPhysicalPower = Math.max(0, netAttack);
        
        // 剩餘防禦 = 目標防禦 - 玩家破防
        const remainDef = Math.max(0, s.defense - p["破防"]);
        const defPen = K.defK / (K.defK + remainDef); // 這是防禦帶來的承傷系數
        const physicalPart = totalPhysicalPower * SkillCoef * defPen;

        // --- 2. 元素區 (Element Zone) ---
        // 公式：元素攻擊 * 元素穿透率
        const remainEleRes = Math.max(0, s.elemental_resist - p["忽視抗性"]);
        const elePen = K.eleK / (K.eleK + remainEleRes);
        const elementPart = p["元素攻擊"] * elePen;

        // --- 3. 命中收益 (Hit Multiplier) ---
        // 擬合公式：0.95 + (1.43 * diff) / (|diff| + hitK)
        const hitDiff = p["命中"] - s.block;
        let hitRate = 0.95 + (1.43 * hitDiff) / (Math.abs(hitDiff) + K.hitK);
        hitRate = Math.max(0, Math.min(1.0, hitRate));
        
        // 期待收益 = 命中率*1 + (1-命中率)*0.5 (格擋造成 50% 傷害)
        const hitMultiplier = 0.5 + (0.5 * hitRate);

        // --- 4. 會心收益 (Crit Multiplier) ---
        // 擬合公式：(115 * diff) / (diff + critK)
        const critDiff = Math.max(0, p["會心"] - s.crit_resist);
        const critRate = Math.min(1.0, (115 * critDiff) / (critDiff + K.critK) / 100);
        
        // 會心傷害期待值：1 + (會心率 * (會心傷害倍率 - 1))
        // 基礎會傷假設為 150%，面板顯示 10 代表總 160%
        const critMultiplier = 1 + (critRate * (0.5 + p["會心傷害"] / 100));

        // --- 5. 通用加成 ---
        const bossBonus = 1 + (p["首領克制%"] / 100);

        // --- 6. 最終結算 ---
        // 傷害 = (物理區 + 元素區) * 命中收益 * 會心收益 * 通用加成
        let expectedDamage = (physicalPart + elementPart) * hitMultiplier * critMultiplier * bossBonus;
        
        if (isNaN(expectedDamage)) expectedDamage = 0;

        return {
            yield: expectedDamage,
            panel: this.convertMapToArray(p), // 回傳渲染用的 15 項陣列
            attrs: {
                "力量": p["力量"], "氣海": p["氣海"], "身法": p["身法"], "根骨": p["根骨"], "耐力": p["耐力"]
            },
            details: {
                hitRate: hitRate * 100,      // 轉為百分比供 UI 顯示
                critRate: critRate * 100,
                defPen: defPen * 100,        // 物理穿透率
                elePen: elePen * 100,        // 元素穿透率
                physicalPart,
                elementPart
            }
        };
    },

    /**
     * 彙總所有模組的 15 項屬性並執行職業轉換
     */
    getFinalPanel(prof, equip, inner) {
        const STAT_NAMES = [
            "攻擊", "元素攻擊", "破防", "忽視抗性", "命中", "會心", "首領克制", 
            "首領克制%", "會心傷害", "破盾", "力量", "氣海", "身法", "根骨", "耐力"
        ];
        
        let final = {};
        STAT_NAMES.forEach(name => final[name] = 0);

        // 步驟 A: 加總所有來源的「原始數值」 (包含白字五維與直接二級屬性)
        const sources = [
            prof.getBaseStats(),    // 職業基礎 + 潛學固定加成 (如果有)
            equip.getTotalStats(),  // 裝備屬性
            inner.getTotalStats()   // 內功屬性
        ];
        
        sources.forEach(src => {
            if (!src) return;
            for (let key in src) {
                if (final.hasOwnProperty(key)) {
                    final[key] += (parseFloat(src[key]) || 0);
                }
            }
        });

        // 步驟 B: 執行職業轉換 (核心：將總五維轉化為攻擊、破防、命中等)
        // 此方法必須在 ProfessionModule 中實作，處理通用收益與主副職特色
        if (prof && typeof prof.applyConversion === 'function') {
            final = prof.applyConversion(final);
        }

        return final;
    },

    /**
     * 將彙總物件轉回 15 項陣列（對齊 UI 顯示順序）
     */
    convertMapToArray(p) {
        const STAT_NAMES = [
            "攻擊", "元素攻擊", "破防", "忽視抗性", "命中", "會心", "首領克制", 
            "首領克制%", "會心傷害", "破盾", "力量", "氣海", "身法", "根骨", "耐力"
        ];
        return STAT_NAMES.map(name => p[name] || 0);
    }
};