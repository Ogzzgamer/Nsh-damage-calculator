/**
 * 最佳化路徑規劃器 (OptimizationPathfinder) - 2.1 詞條校正版
 */
export class OptimizationPathfinder {
    constructor(engine, prof, equip, inner, boss) {
        this.engine = engine;
        this.prof = prof;
        this.equip = equip;
        this.inner = inner;
        this.boss = boss;

        // 【定義內功合法詞條池】
        // 這是你要求的正確屬性清單
        this.INNER_SKILL_OPTIONS = [
            "無", "靈韻", "攻擊", "最大攻擊", "最小攻擊", "元素攻擊", "破防", "命中", "會心", 
            "首領克制", "首領抵禦", "破盾", "力量", "氣海", "身法", "根骨", "耐力",
            "流派克制", "流派抵禦", "防禦", "格擋", "內功防禦", "內功格擋", 
            "外功防禦", "外功格擋", "氣盾", "外功氣盾", "內功氣盾", "全元素抗性"
        ];

        // 【屬性數值定義】
        this.MAX_VALUES = {
            "攻擊": 214,
            "最大攻擊": 280, 
            "最小攻擊": 280,
            "元素攻擊": 127,
            "破防": 314,
            "命中": 92,
            "會心": 109,
            "首領克制": 159,
            "破盾": 166,
            "力量": 34,
            "氣海": 34,
            "身法": 34,
            "根骨": 34,
            "耐力": 34,
            "首領抵禦": 140,
            "流派克制": 125,
            "流派抵禦": 125,
            "防禦": 180,
            "格擋": 96,
            "內功防禦": 180,
            "內功格擋": 96,
            "外功防禦": 180,
            "外功格擋": 96,
            "氣盾": 110,
            "外功氣盾": 110,
            "內功氣盾": 110,
            "全元素抗性": 40
        };

        // 【核心過濾邏輯】
        // 搜尋範圍 = (數值定義中有的) 且 (在 INNER_SKILL_OPTIONS 名單內) 且 (不是無或靈韻)
        this.searchableAttributes = Object.keys(this.MAX_VALUES).filter(name => 
            this.INNER_SKILL_OPTIONS.includes(name) && 
            name !== "無" && 
            name !== "靈韻"
        );
        
        console.log("🚀 優化路徑已啟動，搜尋詞條池已過濾，排除：會心傷害、忽視抗性等非法詞條");
    }

    /**
     * 執行最佳化路徑搜尋
     */
    run(targetSteps = 42) {
        const vInner = this.createVirtualInner(this.inner);
        const vProf = this.createVirtualProf(this.prof);
        const path = [];
        
        const initialResult = this.engine.calculate(vProf, this.equip, vInner, this.boss);
        const initialDmg = initialResult.yield;

        for (let i = 0; i < targetSteps; i++) {
            let bestStep = { name: "收益飽和", gain: -1, dmg: 0 };
            const currentBaseResult = this.engine.calculate(vProf, this.equip, vInner, this.boss);
            const currentBaseDmg = currentBaseResult.yield;

            // 廣度搜尋：只在 searchableAttributes (內功合法池) 裡面找
            for (const name of this.searchableAttributes) {
                const val = this.MAX_VALUES[name];
                
                this.simulateBonus(vInner, name, val);
                const nextResult = this.engine.calculate(vProf, this.equip, vInner, this.boss);
                const gain = (nextResult.yield / currentBaseDmg) - 1;

                if (gain > bestStep.gain) {
                    bestStep = { name, gain, dmg: nextResult.yield };
                }

                this.simulateBonus(vInner, name, -val);
            }

            if (bestStep.gain > 0.00001) {
                this.simulateBonus(vInner, bestStep.name, this.MAX_VALUES[bestStep.name]);
                const totalGrowth = (bestStep.dmg / initialDmg - 1) * 100;

                path.push({
                    step: i + 1,
                    attribute: bestStep.name,
                    value: this.MAX_VALUES[bestStep.name],
                    stepGainPct: (bestStep.gain * 100).toFixed(4),
                    cumulativeGrowth: totalGrowth.toFixed(2),
                    expectedDmg: Math.round(bestStep.dmg)
                });
            } else {
                break; 
            }
        }
        return path;
    }

    simulateBonus(vInner, name, value) {
        // 模擬修改第一個內功槽位的副詞條
        const slot = vInner.slots[0];
        const existing = slot.subStats.find(s => s.name === name);
        
        if (existing) {
            existing.value += value;
        } else {
            slot.subStats.push({ name: name, value: value });
        }
    }

    createVirtualInner(original) {
        const clone = new original.constructor(original.dataLoader);
        clone.slots = JSON.parse(JSON.stringify(original.slots));
        return clone;
    }

    createVirtualProf(original) {
        return Object.assign(Object.create(Object.getPrototypeOf(original)), original);
    }
}