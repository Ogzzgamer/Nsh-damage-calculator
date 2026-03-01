/**
 * 技能循環模組 (Skill Rotation Module)
 * 職責：管理技能倍率、計算循環總倍率、處理內功/周天增益
 */
export class SkillRotationModule {
    constructor(profession) {
        this.profession = profession;
        // 基礎全職業通用增益 (例如：乾坤一擲等)
        this.globalBuffs = {
            damageMultiplier: 1.0, // 最終總傷害乘算
            attributeBonus: 0      // 額外攻擊力等
        };

        // 預設技能組 (以神相為例)
        this.skills = [
            { name: "陽關三疊", multiplier: 1.8, cd: 0, hits: 3 }, // 普攻無 CD
            { name: "御風", multiplier: 8.5, cd: 10 },
            { name: "廣陵散", multiplier: 0, cd: 20, selfBuff: 0.1 } // 增加 10% 攻擊倍率
        ];
    }

    /**
     * 設定當前周天增益 (例如：3金3火)
     * @param {Object} elements { gold: 3, fire: 3, ... }
     */
    getCycleMultiplier(elements) {
        let cycleBonus = 1.0;

        // 模擬火周天：每 1 火提供 0.5% 傷害提升，3 火額外提供 5% 斬殺
        if (elements.fire >= 3) cycleBonus += 0.05;
        
        // 模擬金周天：提升會心傷害 (這部分通常在 DamageEngine 算過了，
        // 這裡主要算對「總傷害百分比」的直接加成)
        if (elements.gold >= 3) cycleBonus += 0.04;

        return cycleBonus;
    }

    /**
     * 計算平均秒倍率 (DPS Coefficient)
     * 邏輯：(技能A倍率/CD_A) + (技能B倍率/CD_B) ...
     */
    calculateTotalRotationCoefficient(elements) {
        let totalDPSCoef = 0;

        this.skills.forEach(skill => {
            if (skill.cd > 0) {
                // 技能在 CD 期間的平均秒貢獻
                totalDPSCoef += skill.multiplier / skill.cd;
            } else {
                // 普攻類，假設一秒打 1.2 次
                totalDPSCoef += skill.multiplier * 1.2;
            }
        });

        // 算上周天/內功的 Buff
        const finalBuff = this.getCycleMultiplier(elements);
        
        return totalDPSCoef * finalBuff;
    }
}