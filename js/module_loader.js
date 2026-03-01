/**
 * 數據讀取模塊 (Module Loader) - 2.1 優化版
 * 職責：負責所有外部 JSON 資源加載，並提供結構化的裝備數據檢索
 * 修改點：新增槽位映射功能，讓 戒指1/2 與 飾品1/2 共享同一份數據庫
 */

export class DataLoader {
    constructor() {
        this.data = {
            equipment: null,
            boss: null,
            innerPower: null
        };
        // 屬性索引映射
        this.STAT_INDEX = {
            ATTACK: 0, ELEMENT_ATTACK: 1, BREAK_DEFENSE: 2, IGNORE_RESIST: 3,
            HIT: 4, CRIT: 5, BOSS_SUPPRESSION: 6, BOSS_SUPPRESSION_PCT: 7,
            CRIT_DMG: 8, SHIELD_BREAK: 9, STRENGTH: 10, QIHAI: 11,
            DEXTERITY: 12, CONSTITUTION: 13, ENDURANCE: 14
        };
    }

    /**
     * 核心初始化函數
     */
    async init() {
        try {
            console.log("正在加載 2.1 數據資源...");
            const [equipRes, bossRes, innerRes] = await Promise.all([
                fetch('./data/equipment.json'),
                fetch('./data/boss.json'),
                fetch('./data/inner_power.json')
            ]);

            if (!equipRes.ok || !bossRes.ok || !innerRes.ok) {
                throw new Error("部分數據檔案讀取失敗，請檢查檔案路徑。");
            }

            this.data.equipment = await equipRes.json();
            this.data.boss = await bossRes.json();
            this.data.innerPower = await innerRes.json();

            console.log("✅ 數據模塊加載完成");
            return true;
        } catch (error) {
            console.error("❌ 數據讀取失敗:", error);
            return false;
        }
    }

    // --- 數據檢索方法 ---

    /**
     * 【核心優化】獲取裝備原始完整數據
     * @param {string} slot - UI 槽位名稱 (如: "戒指1", "飾品2")
     * @param {string} name - 裝備名稱
     * @returns {Object|null}
     */
    getEquipRawData(slot, name) {
        if (!this.data.equipment) return null;

        // --- 槽位映射轉發邏輯 ---
        let dbSlot = slot;
        if (slot.includes("戒指")) dbSlot = "戒指";
        if (slot.includes("飾品")) dbSlot = "飾品";
        // ----------------------

        const category = this.data.equipment[dbSlot];
        if (!category || !category[name]) {
            return null;
        }

        const raw = category[name];

        // 兼容性處理：如果 JSON 裡裝備還只是個數組，則自動封裝成對象
        if (Array.isArray(raw)) {
            return {
                values: raw,
                level: 0,
                set_tag: null
            };
        }

        // 標準格式：{ "values": [...], "level": 115, "set_tag": "百鍊套裝" }
        return {
            values: raw.values || new Array(15).fill(0),
            level: raw.level || 0,
            set_tag: raw.set_tag || null
        };
    }

    /**
     * 獲取指定部位的裝備清單 (供 UI 下拉選單使用)
     * @param {string} slot - UI 槽位名稱
     */
    getEquipListBySlot(slot) {
        let dbSlot = slot;
        if (slot.includes("戒指")) dbSlot = "戒指";
        if (slot.includes("飾品")) dbSlot = "飾品";
        
        return this.data.equipment[dbSlot] ? Object.keys(this.data.equipment[dbSlot]) : [];
    }

    /**
     * 舊方法兼容：僅獲取屬性數組
     */
    getEquipData(slot, name) {
        const data = this.getEquipRawData(slot, name);
        return data ? data.values : new Array(15).fill(0);
    }

    /**
     * 獲取所有 BOSS 列表
     */
    getBossList() {
        return Object.keys(this.data.boss || {});
    }

    /**
     * 獲取指定 BOSS 的屬性與係數
     */
    getBossData(name) {
        return this.data.boss ? this.data.boss[name] : null;
    }

    /**
     * 獲取所有內功種類列表
     */
    getInnerPowerList() {
        return Object.keys(this.data.innerPower || {});
    }

    /**
     * 獲取特定內功的靜態效果
     */
    getInnerPowerEffect(name) {
        return this.data.innerPower ? this.data.innerPower[name] : { effect: {} };
    }
}

export const dataLoader = new DataLoader();