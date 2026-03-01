/**
 * UI 管理模組 (UI Manager)
 */
export class UIManager {
    constructor(innerOptions, dataLoader) {
        // 💡 28 種完整詞條清單
        this.INNER_SKILL_OPTIONS = [
            "無", "靈韻", "攻擊", "最大攻擊", "最小攻擊", "元素攻擊", "破防", "命中", "會心", 
            "首領克制", "首領抵禦", "破盾", "力量", "氣海", "身法", "根骨", "耐力",
            "流派克制", "流派抵禦", "防禦", "格擋", "內功防禦", "內功格擋", 
            "外功防禦", "外功格擋", "氣盾", "外功氣盾", "內功氣盾", "全元素抗性"
        ];
        
        this.dataLoader = dataLoader;
        this.onUpdate = null;           // 當 UI 變動時觸發的回調
        this.onRunOptimization = null;  // 💡 當點擊優化按鈕時觸發的回調

        // 核心 15 維面板顯示順序
        this.STAT_NAMES_15 = [
            "攻擊", "元素攻擊", "破防", "忽視抗性", "命中", "會心", "首領克制", 
            "首領克制%", "會心傷害", "破盾", "力量", "氣海", "身法", "根骨", "耐力"
        ];
    }

    /**
     * 初始化介面渲染
     */
    init() {
        console.log("UIManager: 正在初始化全功能介面...");
        this.renderEquipmentUI();
        this.renderInnerPowerUI();
        this.bindGlobalEvents();
        this.initOptimizerUI(); // 💡 初始化優化器控制項
    }

    /**
     * 💡 初始化優化器控制項 (滑桿與按鈕)
     */
    initOptimizerUI() {
        const slider = document.getElementById("opt-step-slider");
        const display = document.getElementById("opt-step-display");
        const btn = document.getElementById("btn-run-opt");

        if (slider && display) {
            slider.addEventListener("input", () => {
                display.innerText = slider.value;
            });
        }

        if (btn) {
            btn.addEventListener("click", () => {
                if (this.onRunOptimization) {
                    const steps = parseInt(slider.value) || 12;
                    this.onRunOptimization(steps);
                }
            });
        }
    }

    /**
     * 💡 渲染優化結果表格
     */
    renderOptimizationResults(path) {
        const container = document.getElementById("optimization-results");
        if (!container) return;

        if (!path || path.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 40px;">模擬失敗，請檢查面板數據。</div>`;
            return;
        }

        let html = `
            <table class="opt-table">
                <thead>
                    <tr>
                        <th>序號</th>
                        <th>建議提升屬性</th>
                        <th>單步收益 (DPS)</th>
                        <th>累積總提升</th>
                    </tr>
                </thead>
                <tbody>
        `;

        path.forEach(item => {
            html += `
                <tr class="opt-row">
                    <td><span class="step-badge">第 ${item.step} 份</span></td>
                    <td style="color: var(--accent); font-weight: bold;">${item.attribute}</td>
                    <td class="text-gain">+${item.stepGainPct}%</td>
                    <td class="text-total">${item.cumulativeGrowth}%</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    /**
     * 渲染 12 個裝備部位
     */
    renderEquipmentUI() {
        const slots = ["武器", "頭部", "護甲", "手套", "腰帶", "鞋子", "護腕", "項鍊", "戒指1", "戒指2", "飾品1", "飾品2"];
        const container = document.getElementById("equip-container");
        if (!container) return;

        container.innerHTML = "";
        slots.forEach(slot => {
            const div = document.createElement("div");
            div.className = "ui-row";
            div.innerHTML = `<label>${slot}</label>`;
            
            // --- 映射邏輯開始 ---
            let dbKey = slot;
            if (slot.includes("戒指")) dbKey = "戒指";
            if (slot.includes("飾品")) dbKey = "飾品";
            
            // 從 DataLoader 獲取該分類下的所有裝備名稱
            const equipGroup = this.dataLoader.data?.equipment || {};
            const equipNames = Object.keys(equipGroup[dbKey] || {});
            // --- 映射邏輯結束 ---
            
            const select = this.createSelect(`equip-${slot}`, ["無", ...equipNames]);
            div.appendChild(select);
            container.appendChild(div);
        });
    }

    /**
     * 渲染 6 個內功槽位
     */
    renderInnerPowerUI() {
        const container = document.getElementById("inner-container");
        if (!container) return;

        const innerList = this.dataLoader.getInnerPowerList();
        container.innerHTML = "";

        for (let i = 0; i < 6; i++) {
            const card = document.createElement("div");
            card.className = "inner-card";
            card.innerHTML = `<div class="inner-header" style="color:var(--accent); font-weight:bold; margin-bottom:10px;">內功槽位 ${i + 1}</div>`;

            const typeSelect = this.createSelect(`inner-type-${i}`, ["無", ...innerList]);
            card.appendChild(typeSelect);

            const subStatGrid = document.createElement("div");
            subStatGrid.className = "sub-stat-grid";
            subStatGrid.style.marginTop = "10px";

            for (let j = 0; j < 7; j++) {
                const row = document.createElement("div");
                row.className = "sub-stat-row";
                row.style.marginBottom = "5px";

                const statSelect = this.createSelect(`inner-${i}-stat-${j}`, this.INNER_SKILL_OPTIONS);
                const statInput = this.createInput(`inner-${i}-val-${j}`, "number", "0");

                row.appendChild(statSelect);
                row.appendChild(statInput);
                subStatGrid.appendChild(row);
            }

            card.appendChild(subStatGrid);
            container.appendChild(card);
        }
    }

    /**
     * 數據收集
     */
    collectData(equipModule, innerModule) {
        const slots = ["武器", "頭部", "護甲", "手套", "腰帶", "鞋子", "護腕", "項鍊", "戒指1", "戒指2", "飾品1", "飾品2"];
        slots.forEach(slot => {
            const el = document.getElementById(`equip-${slot}`);
            if (el) equipModule.setEquip(slot, el.value === "無" ? "" : el.value);
        });

        for (let i = 0; i < 6; i++) {
            const typeEl = document.getElementById(`inner-type-${i}`);
            if (!typeEl) continue;
            
            const subStats = [];
            for (let j = 0; j < 7; j++) {
                const name = document.getElementById(`inner-${i}-stat-${j}`).value;
                const value = parseFloat(document.getElementById(`inner-${i}-val-${j}`).value) || 0;
                
                if (name !== "無") {
                    subStats.push({ name, value });
                }
            }
            innerModule.updateSlot(i, { type: typeEl.value, subStats });
        }
    }

    /**
     * 渲染計算結果
     */
    renderResults(result) {
        const num = document.getElementById("yield-num");
        if (num) num.innerText = Math.floor(result.yield || 0).toLocaleString();

        // 💡 這裡會由 main.js 中的 renderPanelDetails 處理 15 維渲染
        // 但為了保險，我們保留匯總區域的渲染
        this.renderFullStatSummary(result.raw28 || {}, result.multipliers);
    }

    /**
     * 渲染完整 28 種屬性匯總 (非核心面板，僅供參考)
     */
    renderFullStatSummary(raw28, multipliers) {
        const container = document.getElementById("full-stat-list");
        if (!container) return;

        let html = `<div class="full-stats-grid" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; font-size:0.85em;">`;
        
        this.INNER_SKILL_OPTIONS.forEach(key => {
            if (key === "無" || key === "靈韻") return;
            const val = raw28[key] || 0;
            if (val !== 0) {
                html += `
                    <div class="stat-item" style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <span class="stat-label" style="color:#94a3b8;">${key}</span>
                        <span class="stat-value" style="color:var(--accent);">${val.toFixed(1)}</span>
                    </div>`;
            }
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    /**
     * 數據恢復
     */
    applyData(snapshot) {
        if (!snapshot) return;

        if (snapshot.equips) {
            for (const [slot, value] of Object.entries(snapshot.equips)) {
                const el = document.getElementById(`equip-${slot}`);
                if (el) el.value = value;
            }
        }

        if (snapshot.inners && Array.isArray(snapshot.inners)) {
            snapshot.inners.forEach((innerData, i) => {
                const typeEl = document.getElementById(`inner-type-${i}`);
                if (typeEl) typeEl.value = innerData.type || "無";

                if (innerData.subStats && Array.isArray(innerData.subStats)) {
                    for (let j = 0; j < 7; j++) {
                        const nameEl = document.getElementById(`inner-${i}-stat-${j}`);
                        const valEl = document.getElementById(`inner-${i}-val-${j}`);
                        const savedStat = innerData.subStats[j];
                        if (nameEl) nameEl.value = savedStat ? savedStat.name : "無";
                        if (valEl) valEl.value = savedStat ? savedStat.value : "0";
                    }
                }
            });
        }
    }

    createSelect(id, list) {
        const sel = document.createElement("select");
        sel.id = id;
        list.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item;
            opt.textContent = item;
            sel.appendChild(opt);
        });
        sel.addEventListener("change", () => this.onUpdate && this.onUpdate());
        return sel;
    }

    createInput(id, type, placeholder) {
        const input = document.createElement("input");
        input.id = id;
        input.type = type;
        input.placeholder = placeholder;
        if (type === "number") input.value = "0";
        input.addEventListener("input", () => this.onUpdate && this.onUpdate());
        return input;
    }

    bindGlobalEvents() {
        ["select-profession", "select-sub-profession", "select-boss"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("change", () => this.onUpdate && this.onUpdate());
        });
    }

    resetAllInnerStats() {
        for (let i = 0; i < 6; i++) {
            // 遍歷每個內功槽位的 7 個詞條
            for (let j = 0; j < 7; j++) {
                const statSelect = document.getElementById(`inner-${i}-stat-${j}`);
                const statInput = document.getElementById(`inner-${i}-val-${j}`);
            
                if (statSelect) statSelect.value = "無";
                if (statInput) statInput.value = "0";
            }
        }
        // 重置後手動觸發一次更新計算
        if (this.onUpdate) this.onUpdate();
    }
}