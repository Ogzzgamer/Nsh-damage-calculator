import { dataLoader } from './module_loader.js';
import { ProfessionModule } from './module_profession.js';
import { EquipmentModule } from './module_equipment.js';
import { InnerPowerModule } from './module_inner_power.js';
import { BossModule } from './module_boss.js';
import { DamageEngine } from './DamageEngine.js';
import { UIManager } from './UIManager.js';
import { StorageModule } from './StorageModule.js';

// --- 💡 導入優化路徑模組 ---
import { OptimizationPathfinder } from './OptimizationPathfinder.js';

// --- 全域常量 ---
const PROFESSIONS = ["碎夢", "神相", "龍吟", "血河", "九靈", "鐵衣", "素問", "玄機"];
const INNER_SKILL_OPTIONS = [
    "無", "攻擊", "元素攻擊", "破防", "忽視抗性", "命中", "會心", "首領克制", 
    "首領克制%", "會心傷害", "破盾", "力量", "氣海", "身法", "根骨", "耐力"
];

// --- 初始化模擬器 ---
async function initCalculator() {
    console.log("main.js: 🚀 正在啟動模擬器...");
    
    // 1. 加載數據
    const isLoaded = await dataLoader.init();
    if (!isLoaded) return console.error("FATAL: 數據加載失敗");

    // 2. 實例化所有邏輯模組
    const profInst = new ProfessionModule();
    const equipInst = new EquipmentModule(dataLoader);
    const innerInst = new InnerPowerModule(dataLoader);
    const bossInst = new BossModule(dataLoader);
    const storageInst = new StorageModule();
    const uiInst = new UIManager(INNER_SKILL_OPTIONS, dataLoader);

    // 3. 強制掛載到全域 window 物件
    window.prof = profInst;
    window.equip = equipInst;
    window.inner = innerInst;
    window.boss = bossInst;
    window.storage = storageInst;
    window.ui = uiInst;
    window.engine = DamageEngine;
    window.dataLoader = dataLoader;

    // 4. UI 初始化 (建立基本的 DOM 結構與按鈕綁定)
    uiInst.init();

    // 5. 定義數據更新回調 (靜態面板計算)
    uiInst.onUpdate = () => {
        try {
            // A. 將 UI 數值採集到各個模組實例中
            uiInst.collectData(equipInst, innerInst);
            
            // B. 更新當前 Boss 目標與職業狀態
            const bossEl = document.getElementById('select-boss');
            if (bossEl) {
                bossInst.setTarget(bossEl.value);
            }
            
            const profEl = document.getElementById('select-profession');
            const subProfEl = document.getElementById('select-sub-profession');
            if (profEl && subProfEl) {
                profInst.setProfession(profEl.value, subProfEl.value);
            }

            // C. 呼叫引擎執行核心公式
            const result = DamageEngine.calculate(profInst, equipInst, innerInst, bossInst);
            
            // D. 渲染計算結果到介面
            if (result) {
                uiInst.renderResults(result); // 渲染總 DPS 等
                renderPanelDetails(result);   // 渲染 15 項屬性清單
            }
            
        } catch (err) {
            console.error("更新面板時發生錯誤:", err);
        }
    };

    // --- 💡 6. 核心優化器邏輯連動 ---
    uiInst.onRunOptimization = (targetSteps) => {
        console.log(`[Optimizer] 開始路徑分析，模擬份數: ${targetSteps}`);
        
        // A. 先同步一次最新 UI 數據，確保模擬基準正確
        uiInst.collectData(equipInst, innerInst);
        const bossName = document.getElementById('select-boss')?.value;
        const profName = document.getElementById('select-profession')?.value;
        const subProfName = document.getElementById('select-sub-profession')?.value;
        
        bossInst.setTarget(bossName);
        profInst.setProfession(profName, subProfName);

        // B. 創建優化路徑搜尋器
        const pathfinder = new OptimizationPathfinder(
            DamageEngine,
            profInst,
            equipInst,
            innerInst,
            bossInst
        );

        // C. 執行權重模擬
        const path = pathfinder.run(targetSteps);

        // D. 調用 UI 渲染方法展示表格
        uiInst.renderOptimizationResults(path);
    };

    // 7. 基礎選單初始化與事件綁定
    setupSelectMenus();

    // --- 💡 新增：一鍵清空按鈕監聽 ---
    const resetInnersBtn = document.getElementById('btn-reset-inners');
    if (resetInnersBtn) {
        resetInnersBtn.addEventListener('click', () => {
            if (confirm("確定要清空所有內功副詞條嗎？")) {
                uiInst.resetAllInnerStats();
            }
        });
    }

    // 8. 啟動後的首次渲染校準
    updateSubProfOptions();
    renderSavedList();
    
    const initialBoss = document.getElementById('select-boss')?.value;
    if (initialBoss) bossInst.setTarget(initialBoss);

    // 執行初始計算
    uiInst.onUpdate();
    
    console.log("✅ 模擬器啟動完成");
}

/**
 * 渲染 15 項屬性詳細面板
 */
function renderPanelDetails(result) {
    const display = document.getElementById('panel-display');
    const displayFive = document.getElementById('panel-display-five');
    if (!display || !displayFive || !result.panel) return;
    
    const s = result.panel;

    display.innerHTML = `
        <div class="panel-item"><span>攻擊</span> <strong>${Math.floor(s[0])}</strong></div>
        <div class="panel-item"><span>元素攻擊</span> <strong>${Math.floor(s[1])}</strong></div>
        <div class="panel-item"><span>破防</span> <strong>${Math.floor(s[2])}</strong></div>
        <div class="panel-item"><span>忽視抗性</span> <strong>${Math.floor(s[3])}</strong></div>
        <div class="panel-item"><span>命中</span> <strong>${Math.floor(s[4])}</strong></div>
        <div class="panel-item"><span>會心</span> <strong>${Math.floor(s[5])}</strong></div>
        <div class="panel-item"><span>首領克制</span> <strong>${Math.floor(s[6])}</strong></div>
        <div class="panel-item"><span>首領克制%</span> <strong>${(s[7] || 0).toFixed(1)}%</strong></div>
        <div class="panel-item"><span>會心傷害</span> <strong>${(150 + (s[8] || 0)).toFixed(1)}%</strong></div>
        <div class="panel-item"><span>破盾</span> <strong>${Math.floor(s[9])}</strong></div>
    `;

    displayFive.innerHTML = `
        <div class="panel-item"><span>力量</span> <strong>${Math.floor(s[10])}</strong></div>
        <div class="panel-item"><span>氣海</span> <strong>${Math.floor(s[11])}</strong></div>
        <div class="panel-item"><span>身法</span> <strong>${Math.floor(s[12])}</strong></div>
        <div class="panel-item"><span>根骨</span> <strong>${Math.floor(s[13])}</strong></div>
        <div class="panel-item"><span>耐力</span> <strong>${Math.floor(s[14])}</strong></div>
    `;
}

/**
 * 初始化下拉選單與聯動
 */
function setupSelectMenus() {
    const profSelect = document.getElementById('select-profession');
    const bossSelect = document.getElementById('select-boss');

    const bossList = dataLoader.getBossList();
    if (bossSelect) {
        bossSelect.innerHTML = bossList.map(b => `<option value="${b}">${b}</option>`).join('');
        bossSelect.addEventListener('change', () => window.ui.onUpdate());
    }

    if (profSelect) {
        profSelect.addEventListener('change', () => {
            updateSubProfOptions();
            window.ui.onUpdate();
        });
    }
    
    document.getElementById('select-sub-profession')?.addEventListener('change', () => window.ui.onUpdate());

    document.getElementById('btn-save-panel')?.addEventListener('click', handleSaveConfig);
    document.getElementById('btn-export')?.addEventListener('click', () => window.storage.exportToFile());
    document.getElementById('btn-import')?.addEventListener('click', handleImport);
}

/**
 * 處理保存配置
 */
function handleSaveConfig() {
    const name = prompt("請輸入方案名稱：");
    if (!name) return;
    
    const snapshot = {
        global: {
            main: document.getElementById('select-profession').value,
            sub: document.getElementById('select-sub-profession').value,
            boss: document.getElementById('select-boss').value
        },
        equips: {},
        inners: []
    };

    const slots = ["武器", "頭部", "護甲", "手套", "腰帶", "鞋子", "護腕", "項鍊", "戒指1", "戒指2", "飾品1", "飾品2"];
    slots.forEach(s => { 
        snapshot.equips[s] = document.getElementById(`equip-${s}`)?.value || "無"; 
    });

    for (let i = 0; i < 6; i++) {
        const stats = [];
        for (let j = 0; j < 7; j++) {
            stats.push({
                name: document.getElementById(`inner-${i}-stat-${j}`).value,
                value: document.getElementById(`inner-${i}-val-${j}`).value
            });
        }
        snapshot.inners.push({ 
            type: document.getElementById(`inner-type-${i}`).value, 
            subStats: stats 
        });
    }

    const result = DamageEngine.calculate(window.prof, window.equip, window.inner, window.boss);
    window.storage.save(name, result.yield, snapshot);
    renderSavedList();
}

/**
 * 載入配置
 */
window.loadConfig = (id) => {
    const data = window.storage.getById(id);
    if (!data || !data.snapshot) return;
    const snp = data.snapshot;

    document.getElementById('select-profession').value = snp.global.main;
    updateSubProfOptions(); 
    
    setTimeout(() => {
        document.getElementById('select-sub-profession').value = snp.global.sub;
        document.getElementById('select-boss').value = snp.global.boss;
        window.ui.applyData(snp); 
        window.ui.onUpdate();    
    }, 50);
};

window.deleteSave = (id) => {
    if (confirm("確定刪除此方案？")) { 
        window.storage.delete(id); 
        renderSavedList(); 
    }
};

async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await window.storage.importFromFile(file);
            renderSavedList();
        }
    };
    input.click();
}

function updateSubProfOptions() {
    const main = document.getElementById('select-profession').value;
    const sub = document.getElementById('select-sub-profession');
    if (!sub) return;

    const currentSub = sub.value;
    sub.innerHTML = '<option value="無">無</option>';
    PROFESSIONS.forEach(p => {
        if (p !== main) {
            const opt = document.createElement('option');
            opt.value = p; opt.textContent = p;
            sub.appendChild(opt);
        }
    });
    sub.value = (currentSub !== main) ? currentSub : "無";
}

function renderSavedList() {
    const container = document.getElementById('saved-list');
    if (!container) return;
    const saved = window.storage.getAll();
    container.innerHTML = saved.map(item => `
        <div class="saved-item">
            <div class="saved-info">
                <strong>${item.name}</strong><br>
                <small>DPS: ${Math.floor(item.yield).toLocaleString()}</small>
            </div>
            <div class="saved-actions">
                <button class="btn-load" onclick="loadConfig(${item.id})">載入</button>
                <button class="btn-delete" onclick="deleteSave(${item.id})">刪除</button>
            </div>
        </div>
    `).join('') || '<p style="text-align:center;color:#999;padding:10px;">暫無保存方案</p>';
}

// 啟動主程序
initCalculator();