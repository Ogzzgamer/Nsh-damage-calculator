
        // 全局變量存儲加載的數據
        let TARGET_PRESETS = {};
        let EQUIPMENT_PRESETS_BY_SLOT = {};
        
        // 套裝效果映射
        const SET_EFFECTS = {
            81: { 
                upperTwoSet: { bossDamage: 607 }, // 首領克制
                upperFourSet: { bossDamagePercent: 0.067 }, // 首領克制%
                lowerTwoSet: { bossDamagePercent: 0.084, critDamage: 0 }
            },
            83: { 
                upperTwoSet: { bossDamage: 619 }, 
                upperFourSet: { bossDamagePercent: 0.075 },
                lowerTwoSet: { bossDamagePercent: 0.085, critDamage: 0.04 }
            },
            85: { 
                upperTwoSet: { bossDamage: 630 }, 
                upperFourSet: { bossDamagePercent: 0.082 },
                lowerTwoSet: { bossDamagePercent: 0.087, critDamage: 0.041 }
            }
        };

        // 獨珍效果映射
        const UNIQUE_EFFECTS = {
            "薛北鯤·孤鷹腰帶": function(totalStats) {
                return {
                    attack: totalStats.constitution * 1  // 攻擊=根骨*1
                };
            },
            "牧野彌戒指": { bossDamage: 180, crit: 100 },
            "柳星聞項鍊": { bossDamagePercent: 0.06, critDamage: 0.05 },
            "南問雪手鐲": { elementalAttack: 150, armorBreak: 100 },
            "黑天尊使護腕": { attack: 200, armorBreak: 100 },
        };
        
        // 內功詞條選項
        const INNER_SKILL_OPTIONS = [
            "攻擊", "元素攻擊", "破防", "忽視抗性", "命中", "會心", 
            "首領克制", "會心傷害", "破盾", "力量", "氣海", "身法", "根骨", "耐力"
        ];

        // 上半身部位 (適用百鍊套裝效果)
        const UPPER_BODY_SLOTS = ["頭部", "手套", "護腕", "腰帶", "鞋子"];
        
        // 下半身部位 (適用百鍊套裝效果)
        const LOWER_BODY_SLOTS = ["飾品1", "飾品2", "項鍊"];

        // 五維屬性轉換規則
        const FIVE_STATS_CONVERSION = {
            "力量": {"攻擊": 4.65, "破防": 2},
            "氣海": {"攻擊": 4.65, "破防": 2},
            "身法": {"會心": 1.6, "命中": 0.83},
            "根骨": {},
            "耐力": {}
        };

        // 職業分類
        const PROFESSION_TYPES = {
            "內功": ["神相", "九靈", "素問", "龍吟"],
            "外功": ["碎夢", "鐵衣", "血河"]
        };

        // 職業特殊轉換規則
        const PROFESSION_CONVERSION = {
            "神相": {"氣海": {"命中": 0.83}},
            "九靈": {"耐力": {"攻擊": 1.65}},
            "素問": {},
            "龍吟": {"根骨": {"破防": 2}},
            "碎夢": {"身法": {"會心": 0.6}},
            "鐵衣": {},
            "血河": {"根骨": {"攻擊": 1.65}}
        };

        // 職業效果描述
        const PROFESSION_EFFECTS = {
            "神相": "每點氣海額外+0.83命中",
            "九靈": "每點耐力額外+1.65攻擊",
            "素問": "暫無特殊轉換",
            "龍吟": "每點根骨額外+2破防",
            "碎夢": "每點身法額外+0.6會心",
            "鐵衣": "暫無特殊轉換",
            "血河": "每點根骨額外+1.65攻擊"
        };

        // 當前選擇的職業
        let selectedMainProfession = "神相";
        let selectedTrait = "龍吟";
        let specialRuleActive = false;

        // 屬性名稱對應
        const STAT_NAMES = [
            "攻擊", "元素攻擊", "破防", "忽視抗性", "命中", "會心", "首領克制", 
            "首領克制%", "會心傷害", "破盾", "力量", "氣海", "身法", "根骨", "耐力"
        ];

        // 裝備部位
        const EQUIPMENT_SLOTS = [
            "頭部", "手套", "護腕", "腰帶", "護甲", "鞋子", 
            "武器", "飾品1", "飾品2", "戒指1", "戒指2", "項鍊"
        ];
        
        // 內功配置
		let currentInnerSkills = Array(6).fill().map(() => Array(7).fill().map(() => ({ type: '', value: 0 })));
        let newInnerSkills = Array(6).fill().map(() => Array(7).fill().map(() => ({ type: '', value: 0 })));
        let currentInnerStats = new Array(15).fill(0);
        let newInnerStats = new Array(15).fill(0);

        // 當前穿戴的裝備 (用於計算基礎面板)
        let currentWearingEquipment = {};
        
        // 新裝備配置
        let newEquipment = {};
        
        // 基礎面板屬性 (不含裝備)
        let baseStats = new Array(15).fill(0);

        // 加載外部JSON數據
        function loadExternalData() {
            // 使用Promise.all同時加載兩個JSON文件
            Promise.all([
                fetch('targets.json').then(response => response.json()),
                fetch('equipments.json').then(response => response.json())
            ])
            .then(([targets, equipments]) => {
                TARGET_PRESETS = targets;
                EQUIPMENT_PRESETS_BY_SLOT = equipments;
                
                // 隱藏加載指示器
                document.getElementById('dataLoading').classList.add('hidden');
                // 顯示應用內容
                document.getElementById('appContent').classList.remove('hidden');
                
                // 初始化應用
                initializeApp();
            })
            .catch(error => {
                console.error('加載數據時出錯:', error);
                document.getElementById('dataLoading').innerHTML = `
                    <div class="text-center p-8">
                        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                        <p class="text-red-700 font-bold mb-2">數據加載失敗</p>
                        <p class="text-gray-600 mb-4">請檢查JSON文件是否可用</p>
                        <button onclick="location.reload()" class="px-4 py-2 bg-purple-600 text-white rounded-lg">
                            <i class="fas fa-sync-alt mr-2"></i>重新加載
                        </button>
                    </div>
                `;
            });
        }
        
        // 初始化應用
        function initializeApp() {
            createCurrentEquipmentSelectors();
            createNewEquipmentSelectors();
            createInnerSkillSelectors();
            setupEventListeners();
            updateSetEffects('current');
            updateSetEffects('new');
            updateFiveStatsDisplay();
            updateProfessionEffects();
            updateConversionDisplay();
            populateTargetSelect();
            setupFiveStatsInputListeners();
        }

        // 填充目標選擇下拉菜單
        function populateTargetSelect() {
            const targetSelect = document.getElementById('targetSelect');
            targetSelect.innerHTML = '<option value="">請選擇目標</option>';
            
            for (const targetName in TARGET_PRESETS) {
                const option = document.createElement('option');
                option.value = targetName;
                option.textContent = targetName;
                targetSelect.appendChild(option);
            }
            
            // 設置默認值
            if (TARGET_PRESETS.hasOwnProperty('英雄鏡天閣禁閣')) {
                targetSelect.value = '英雄鏡天閣禁閣';
            }
            
            updateTargetStats();
        }

        // 設置五維屬性輸入監聽
        function setupFiveStatsInputListeners() {
            const stats = ['strength', 'qihai', 'agility', 'constitution', 'endurance'];
            stats.forEach(stat => {
                document.getElementById(`current_${stat}`).addEventListener('input', function() {
                    updateFiveStatsDisplay();
                });
            });
        }

        // 更新五維屬性顯示
        function updateFiveStatsDisplay() {
            document.getElementById('strengthValue').textContent = 
                document.getElementById('current_strength').value || '0';
            document.getElementById('qihaiValue').textContent = 
                document.getElementById('current_qihai').value || '0';
            document.getElementById('agilityValue').textContent = 
                document.getElementById('current_agility').value || '0';
            document.getElementById('constitutionValue').textContent = 
                document.getElementById('current_constitution').value || '0';
            document.getElementById('enduranceValue').textContent = 
                document.getElementById('current_endurance').value || '0';
        }

        // 更新轉換顯示
        function updateConversionDisplay() {
            const container = document.getElementById('conversionDisplay');
            
            if (!selectedMainProfession) {
                container.innerHTML = '<div class="text-center py-4 text-white"><div>請選擇職業查看轉換規則</div></div>';
                return;
            }
            
            const professionType = PROFESSION_TYPES["內功"].includes(selectedMainProfession) ? "內功" : "外功";
            
            let html = '';
            
            // 主職業轉換
            html += `
                <div class="conversion-card">
                    <h3 class="text-md font-medium conversion-header mb-3">主職業: ${selectedMainProfession} (${professionType})</h3>
                    <ul class="text-sm text-white space-y-2">
            `;
            
            if (professionType === "外功") {
                html += `
                    <li><span class="font-medium">力量</span> → 攻擊: 4.65, 破防: 2.0</li>
                    <li><span class="font-medium">身法</span> → 會心: 1.6, 命中: 0.83</li>
                `;
            } else {
                html += `
                    <li><span class="font-medium">氣海</span> → 攻擊: 4.65, 破防: 2.0</li>
                    <li><span class="font-medium">身法</span> → 會心: 1.6, 命中: 0.83</li>
                `;
            }
            
            // 添加職業特殊轉換
            if (PROFESSION_CONVERSION[selectedMainProfession]) {
                Object.keys(PROFESSION_CONVERSION[selectedMainProfession]).forEach(stat => {
                    const conversions = PROFESSION_CONVERSION[selectedMainProfession][stat];
                    Object.keys(conversions).forEach(target => {
                        html += `<li><span class="font-medium">${stat}</span> → ${target}: ${conversions[target]}</li>`;
                    });
                });
            }
            
            html += `</ul></div>`;
            
            // 特質轉換
            if (selectedTrait) {
                html += `
                    <div class="conversion-card">
                        <h3 class="text-md font-medium conversion-header mb-3">特質: ${selectedTrait}</h3>
                        <ul class="text-sm text-white space-y-2">
                `;
                
                // 特殊規則：主職業為外功且特質為神相時
                if (selectedMainProfession && PROFESSION_TYPES["外功"].includes(selectedMainProfession) && 
                    selectedTrait === "神相") {
                    html += `<li><span class="font-medium">力量</span> → 命中: 0.83</li>`;
                } 
                // 其他特質轉換
                else if (PROFESSION_CONVERSION[selectedTrait]) {
                    Object.keys(PROFESSION_CONVERSION[selectedTrait]).forEach(stat => {
                        const conversions = PROFESSION_CONVERSION[selectedTrait][stat];
                        Object.keys(conversions).forEach(target => {
                            html += `<li><span class="font-medium">${stat}</span> → ${target}: ${conversions[target]}</li>`;
                        });
                    });
                } else {
                    html += `<li>暫無特殊轉換</li>`;
                }
                
                html += `</ul></div>`;
            }
            
            container.innerHTML = html;
        }

        // 創建當前裝備選擇器
        function createCurrentEquipmentSelectors() {
            const container = document.getElementById('currentEquipmentSelectors');
            container.innerHTML = '';

            EQUIPMENT_SLOTS.forEach(slot => {
                // 確保該裝備槽位存在於數據中
                if (!EQUIPMENT_PRESETS_BY_SLOT[slot]) {
                    console.warn(`未找到槽位 ${slot} 的裝備數據`);
                    return;
                }
                
                const div = document.createElement('div');
                div.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <label class="text-sm w-16 font-medium text-purple-200">${slot}</label>
                        <select id="current_equipment_${slot}" class="flex-1 p-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white bg-opacity-90 text-gray-800
">
                            ${Object.keys(EQUIPMENT_PRESETS_BY_SLOT[slot]).map(item => 
                                `<option value="${item}">${item}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
                container.appendChild(div);

                // 設置事件監聽器
                const select = div.querySelector('select');
                select.addEventListener('change', () => {
                    currentWearingEquipment[slot] = select.value;
                    updateSetEffects('current');
                });

                // 初始化選擇
                const defaultItem = slot === "武器" ? "83百鍊武器" : 
                                  slot === "護甲" ? "81柳星聞‧黯月孤照袍" : 
                                  Object.keys(EQUIPMENT_PRESETS_BY_SLOT[slot])[1];
                select.value = defaultItem;
                currentWearingEquipment[slot] = defaultItem;
            });
        }

        // 創建新裝備選擇器
        function createNewEquipmentSelectors() {
            const container = document.getElementById('newEquipmentSelectors');
            container.innerHTML = '';

            EQUIPMENT_SLOTS.forEach(slot => {
                // 確保該裝備槽位存在於數據中
                if (!EQUIPMENT_PRESETS_BY_SLOT[slot]) {
                    console.warn(`未找到槽位 ${slot} 的裝備數據`);
                    return;
                }
                
                const div = document.createElement('div');
                div.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <label class="text-sm w-16 font-medium text-purple-200">${slot}</label>
                        <select id="new_equipment_${slot}" class="flex-1 p-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white bg-opacity-90 text-gray-800">
                            ${Object.keys(EQUIPMENT_PRESETS_BY_SLOT[slot]).map(item => 
                                `<option value="${item}">${item}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
                container.appendChild(div);

                // 設置事件監聽器
                const select = div.querySelector('select');
                select.addEventListener('change', () => {
                    newEquipment[slot] = select.value;
                    updateSetEffects('new');
                });

                // 初始化選擇
                const defaultItem = slot === "武器" ? "85百鍊武器" : 
                                  slot === "護甲" ? "李白天地光陰袍" : 
                                  Object.keys(EQUIPMENT_PRESETS_BY_SLOT[slot])[1];
                select.value = defaultItem;
                newEquipment[slot] = defaultItem;
            });
        }
        
        // 創建內功選擇器
        function createInnerSkillSelectors() {
            const currentContainer = document.getElementById('currentInnerSkills');
            const newContainer = document.getElementById('newInnerSkills');
            
            currentContainer.innerHTML = '';
            newContainer.innerHTML = '';
            
            // 為當前和新內功各創建6個內功卡片
            for (let i = 0; i < 6; i++) {
                currentContainer.appendChild(createInnerSkillCard(i, 'current'));
                newContainer.appendChild(createInnerSkillCard(i, 'new'));
            }
        }
        
        // 創建單個內功卡片
        function createInnerSkillCard(index, type) {
            const card = document.createElement('div');
            card.className = 'inner-skill-card';
            
            const innerSkillName = type === 'current' ? `當前內功 ${index + 1}` : `新內功 ${index + 1}`;
            
            card.innerHTML = `
                <div class="inner-skill-header">
                    <div class="inner-skill-title">
                        <div class="inner-skill-icon">
                            <i class="fas fa-brain"></i>
                        </div>
                        ${innerSkillName}
                    </div>
                </div>
                <div class="inner-skill-stats">
                    <div class="inner-skill-stat">
                        <div class="inner-skill-label">主詞條 (固定)</div>
                        <div class="inner-skill-value">氣血</div>
                    </div>
                    ${Array(7).fill().map((_, i) => `
                        <div class="inner-skill-stat">
                            <div class="inner-skill-label">副詞條 ${i + 1}</div>
                            <select id="${type}_inner_${index}_${i}" class="inner-skill-select">
                                <option value="">請選擇副詞條</option>
                                ${INNER_SKILL_OPTIONS.map(option => 
                                    `<option value="${option}">${option}</option>`
                                ).join('')}
                            </select>
                            <input type="number" min="0" step="1" 
                                id="${type}_inner_value_${index}_${i}" 
                                class="inner-skill-value-input" 
                                placeholder="輸入數值" 
                                value="0">
                        </div>
                    `).join('')}
                </div>
            `;
            
            // 為每個副詞條下拉菜單添加事件監聽器
            for (let i = 0; i < 7; i++) {
                const select = card.querySelector(`#${type}_inner_${index}_${i}`);
                const input = card.querySelector(`#${type}_inner_value_${index}_${i}`);
                
                // 設置選擇器事件監聽
                select.addEventListener('change', function() {
                    if (type === 'current') {
                        currentInnerSkills[index][i].type = this.value;
                    } else {
                        newInnerSkills[index][i].type = this.value;
                    }
                });
                
                // 設置輸入框事件監聽
                input.addEventListener('input', function() {
                    const value = parseFloat(this.value) || 0;
                    if (type === 'current') {
                        currentInnerSkills[index][i].value = value;
                    } else {
                        newInnerSkills[index][i].value = value;
                    }
                });
            }
            
            return card;
        }
        
        // 計算內功屬性加成
        function calculateInnerSkillStats(type) {
            const skills = type === 'current' ? currentInnerSkills : newInnerSkills;
            const stats = new Array(15).fill(0);
            
            // 遍歷所有內功的所有副詞條
            for (let i = 0; i < skills.length; i++) {
                for (let j = 0; j < skills[i].length; j++) {
                    const skill = skills[i][j];
                    if (skill.type && skill.value > 0) {
                        // 根據屬性名稱找到對應的索引
                        const statIndex = STAT_NAMES.findIndex(name => name === skill.type);
                        if (statIndex !== -1) {
                            stats[statIndex] += skill.value;
                        }
                    }
                }
            }
            
            // 保存結果
            if (type === 'current') {
                currentInnerStats = stats;
                displayInnerSkillStats('current', stats);
            } else {
                newInnerStats = stats;
                displayInnerSkillStats('new', stats);
            }
        }
        
        // 顯示內功屬性
        function displayInnerSkillStats(type, stats) {
            const containerId = type === 'current' ? 'currentInnerStatsDisplay' : 'newInnerStatsDisplay';
            const container = document.getElementById(containerId);
            
            let html = '<div class="grid grid-cols-2 gap-2">';
            
            for (let i = 0; i < stats.length; i++) {
                if (stats[i] !== 0) {
                    const value = i === 7 || i === 8 ? 
                        `${(stats[i]).toFixed(2)}%` : 
                        Math.round(stats[i]);
                    html += `
                        <div class="text-sm">
                            ${STAT_NAMES[i]}: <span class="font-medium">${value}</span>
                        </div>
                    `;
                }
            }
            
            html += '</div>';
            
            container.innerHTML = html;
            
            // 如果是新內功，還需要顯示差異對比
            if (type === 'new') {
                displayInnerSkillComparison();
            }
        }
        
        // 顯示內功屬性差異
        function displayInnerSkillComparison() {
            const container = document.getElementById('newInnerStatsDisplay');
            
            let html = '<div class="space-y-2">';
            
            for (let i = 0; i < newInnerStats.length; i++) {
                const newValue = newInnerStats[i];
                const currentValue = currentInnerStats[i];
                
                if (newValue === 0 && currentValue === 0) continue;
                
                const diff = newValue - currentValue;
                let diffClass = 'diff-neutral';
                let diffSign = '';
                
                if (diff > 0) {
                    diffClass = 'diff-positive';
                    diffSign = '+';
                } else if (diff < 0) {
                    diffClass = 'diff-negative';
                }
                
                const displayValue = i === 7 || i === 8 ? 
                    `${newValue.toFixed(2)}%` : 
                    Math.round(newValue);
                
                const displayDiff = i === 7 || i === 8 ? 
                    `${diffSign}${diff.toFixed(2)}%` : 
                    `${diffSign}${Math.round(diff)}`;
                
                html += `
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-white">${STAT_NAMES[i]}:</span>
                        <div class="flex items-center">
                            <span class="font-medium text-white mr-2">${displayValue}</span>
                            <span class="${diffClass} inner-skill-diff">${displayDiff}</span>
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            
            container.innerHTML = html;
        }

        // 設置事件監聽器
        function setupEventListeners() {
            document.getElementById('targetSelect').addEventListener('change', function() {
                updateTargetStats();
            });
            
            document.getElementById('mainProfessionSelect').addEventListener('change', function() {
                selectedMainProfession = this.value;
                updateProfessionEffects();
                updateConversionDisplay();
                checkSpecialRule();
            });
            
            document.getElementById('traitSelect').addEventListener('change', function() {
                selectedTrait = this.value;
                updateProfessionEffects();
                updateConversionDisplay();
                checkSpecialRule();
            });
        }
        
        // 檢查特殊規則
        function checkSpecialRule() {
            const notification = document.getElementById('notification');
            specialRuleActive = false;
            
            if (selectedMainProfession && PROFESSION_TYPES["外功"].includes(selectedMainProfession) && 
                selectedTrait === "神相") {
                specialRuleActive = true;
                notification.classList.add('show');
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 3000);
            }
        }

        // 更新目標屬性顯示
        function updateTargetStats() {
            const targetSelect = document.getElementById('targetSelect');
            const targetStatsDiv = document.getElementById('targetStats');
            const selectedTarget = targetSelect.value;

            if (!selectedTarget || !TARGET_PRESETS[selectedTarget]) {
                targetStatsDiv.innerHTML = '<div class="flex items-center justify-center h-24"><i class="fas fa-crosshairs mr-2"></i>請先選擇目標</div>';
                return;
            }

            const stats = TARGET_PRESETS[selectedTarget];
            targetStatsDiv.innerHTML = `
                <div class="grid grid-cols-2 gap-2 text-white">
                    <div>防禦: <span class="font-medium">${stats.defense}</span></div>
                    <div>元素抗性: <span class="font-medium">${stats.elemental_resist}</span></div>
                    <div>格擋: <span class="font-medium">${stats.block}</span></div>
                    <div>會心抗性: <span class="font-medium">${stats.crit_resist}</span></div>
                    <div>抵禦: <span class="font-medium">${stats.defense_base}</span></div>
                    <div>氣盾: <span class="font-medium">${stats.shield_base}</span></div>
                </div>
            `;
        }

        // 更新職業效果顯示
        function updateProfessionEffects() {
            const effectsDiv = document.getElementById('professionEffects');
            
            if (!selectedMainProfession && !selectedTrait) {
                effectsDiv.innerHTML = '<div class="flex items-center justify-center h-full text-white"><i class="fas fa-info-circle mr-2"></i>請選擇職業查看效果</div>';
                return;
            }
            
            let effectsHtml = '<div class="space-y-2 text-white">';
            
            if (selectedMainProfession) {
                const professionType = PROFESSION_TYPES["內功"].includes(selectedMainProfession) ? "內功" : "外功";
                effectsHtml += `
                    <div class="text-sm">
                        <span class="font-medium">主職業:</span> ${selectedMainProfession} (${professionType})
                        <div class="text-xs ml-2">${PROFESSION_EFFECTS[selectedMainProfession]}</div>
                    </div>
                `;
            }
            
            if (selectedTrait) {
                const traitType = PROFESSION_TYPES["內功"].includes(selectedTrait) ? "內功" : "外功";
                
                // 特殊規則顯示
                let traitEffect = PROFESSION_EFFECTS[selectedTrait];
                if (specialRuleActive) {
                    traitEffect = "每點力量額外+0.83命中";
                }
                
                effectsHtml += `
                    <div class="text-sm">
                        <span class="font-medium">特質:</span> ${selectedTrait} (${traitType})
                        <div class="text-xs ml-2">${traitEffect}</div>
                    </div>
                `;
            }
            
            // 顯示有效五維屬性
            if (selectedMainProfession) {
                const professionType = PROFESSION_TYPES["內功"].includes(selectedMainProfession) ? "內功" : "外功";
                const validStats = professionType === "內功" ? "氣海、身法、根骨、耐力" : "力量、身法、根骨、耐力";
                effectsHtml += `
                    <div class="text-xs mt-2 pt-2 border-t">
                        有效五維屬性: ${validStats}
                    </div>
                `;
            }
            
            effectsHtml += '</div>';
            effectsDiv.innerHTML = effectsHtml;
        }

        // 修復的套裝效果計算函數（支持向下兼容）
        function calculateSetEffects(equipmentConfig) {
            const setEffects = {
                upperSet: { level: null, count: 0, effects: [] },
                lowerSet: { level: null, count: 0, effects: [] },
                uniqueEffects: [] // 新增：存儲所有獨珍效果
            };
            
            // 上半身百鍊裝備等級列表
            const upperItems = [];
            UPPER_BODY_SLOTS.forEach(slot => {
                const itemName = equipmentConfig[slot];
                if (itemName && (itemName.includes('81百鍊') || itemName.includes('83百鍊') || itemName.includes('85百鍊'))) {
                    if (itemName.includes('81百鍊')) upperItems.push(81);
                    else if (itemName.includes('83百鍊')) upperItems.push(83);
                    else if (itemName.includes('85百鍊')) upperItems.push(85);
                }
                
                // 檢查是否為獨珍裝備
                if (itemName && UNIQUE_EFFECTS[itemName]) {
                    setEffects.uniqueEffects.push({
                        name: itemName,
                        effect: UNIQUE_EFFECTS[itemName]
                    });
                }
            });
            
            // 修復的邏輯：分別計算兩件套和四件套效果（向下兼容）
            if (upperItems.length > 0) {
                // 兩件套效果：取可激活的最高等級
                const sortedUpper = [...upperItems].sort((a, b) => b - a); // 降序排序
                let twoSetLevel = null;
                for (const level of [85, 83, 81]) {
                    if (sortedUpper.filter(itemLevel => itemLevel >= level).length >= 2) {
                        twoSetLevel = level;
                        break;
                    }
                }
                
                // 四件套效果：取可激活的最高等級
                let fourSetLevel = null;
                for (const level of [85, 83, 81]) {
                    if (sortedUpper.filter(itemLevel => itemLevel >= level).length >= 4) {
                        fourSetLevel = level;
                        break;
                    }
                }
                
                // 應用效果
                if (twoSetLevel) {
                    setEffects.upperSet.effects.push({
                        name: "2件套效果",
                        value: `首領克制 +${SET_EFFECTS[twoSetLevel].upperTwoSet.bossDamage}`,
                        level: twoSetLevel
                    });
                }
                
                if (fourSetLevel) {
                    setEffects.upperSet.effects.push({
                        name: "4件套效果",
                        value: `首領克制 +${(SET_EFFECTS[fourSetLevel].upperFourSet.bossDamagePercent * 100).toFixed(1)}%`,
                        level: fourSetLevel
                    });
                }
            }
            
            // 統計下半身套裝（支持向下兼容）
            const lowerItems = [];
            LOWER_BODY_SLOTS.forEach(slot => {
                const itemName = equipmentConfig[slot];
                if (itemName && (itemName.includes('81百鍊') || itemName.includes('83百鍊') || itemName.includes('85百鍊'))) {
                    if (itemName.includes('81百鍊')) lowerItems.push(81);
                    else if (itemName.includes('83百鍊')) lowerItems.push(83);
                    else if (itemName.includes('85百鍊')) lowerItems.push(85);
                }
                
                // 檢查是否為獨珍裝備
                if (itemName && UNIQUE_EFFECTS[itemName]) {
                    setEffects.uniqueEffects.push({
                        name: itemName,
                        effect: UNIQUE_EFFECTS[itemName]
                    });
                }
            });
            
            // 下半身只有兩件套效果
            if (lowerItems.length > 0) {
                // 兩件套效果：取可激活的最高等級
                const sortedLower = [...lowerItems].sort((a, b) => b - a); // 降序排序
                let twoSetLevel = null;
                for (const level of [85, 83, 81]) {
                    if (sortedLower.filter(itemLevel => itemLevel >= level).length >= 2) {
                        twoSetLevel = level;
                        break;
                    }
                }
                
                // 應用效果
                if (twoSetLevel) {
                    setEffects.lowerSet.effects.push({
                        name: "2件套效果",
                        value: `首領克制 +${(SET_EFFECTS[twoSetLevel].lowerTwoSet.bossDamagePercent * 100).toFixed(1)}%, 會心傷害 +${(SET_EFFECTS[twoSetLevel].lowerTwoSet.critDamage * 100).toFixed(1)}%`,
                        level: twoSetLevel
                    });
                }
            }
            
            return setEffects;
        }
        
        // 應用套裝效果到屬性
        /**
        * 套用「獨珍／套裝」效果到 stats 陣列。
        * 支援：
        *   • 靜態效果 → 用物件描述 (例如 { attack:200, bossDamage:150 })
        *   • 函式效果 → (statsArr, totalsObj) => { ... } 內自行對 statsArr 加值
        *
        * @param {number[]} stats       長度 15 的屬性陣列，直接就地修改
        * @param {Object}   setEffects  由 getSelectedSetEffects() 回傳，
        *                               需至少含 uniqueEffects: string[]  
        * @param {Object}   totals      buildTotalStatsObject() 產生的總屬性物件
        */
        function applySetEffects(stats, setEffects, totals) {
            if (!setEffects || !Array.isArray(setEffects.uniqueEffects)) return;

            setEffects.uniqueEffects.forEach(unique => {
                const effectDef = unique.effect;
                if (!effectDef) return;
        
                // 函數型效果 - 傳入總屬性物件
                if (typeof effectDef === 'function') {
                    // 確保傳入的 totals 物件包含所有五維屬性
                    const totalsWithDefaults = {
                        strength: totals?.strength || 0,
                        qihai: totals?.qihai || 0,
                        agility: totals?.agility || 0,
                        constitution: totals?.constitution || 0,
                        endurance: totals?.endurance || 0
                    };
                    const effectResult = effectDef(totalsWithDefaults);
            
                    // 應用函數返回的效果
                    if (effectResult) {
                        for (const stat in effectResult) {
                            const value = effectResult[stat];
                            switch(stat) {
                                case 'attack': stats[0] += value; break;
                                case 'elementalAttack': stats[1] += value; break;
                                case 'armorBreak': stats[2] += value; break;
                                case 'ignoreResist': stats[3] += value; break;
                                case 'hit': stats[4] += value; break;
                                case 'crit': stats[5] += value; break;
                                case 'bossDamage': stats[6] += value; break;
                                case 'bossDamagePercent': stats[7] += value; break;
                                case 'critDamage': stats[8] += value; break;
                                case 'shieldBreak': stats[9] += value; break;
                            }
                        }
                    }
                } 
                // 物件型效果
                else if (typeof effectDef === 'object') {
                    if (effectDef.attack) stats[0] += effectDef.attack;
                    if (effectDef.elementalAttack) stats[1] += effectDef.elementalAttack;
                    if (effectDef.armorBreak) stats[2] += effectDef.armorBreak;
                    if (effectDef.ignoreResist) stats[3] += effectDef.ignoreResist;
                    if (effectDef.hit) stats[4] += effectDef.hit;
                    if (effectDef.crit) stats[5] += effectDef.crit;
                    if (effectDef.bossDamage) stats[6] += effectDef.bossDamage;
                    if (effectDef.bossDamagePercent) stats[7] += effectDef.bossDamagePercent;
                    if (effectDef.critDamage) stats[8] += effectDef.critDamage;
                    if (effectDef.shieldBreak) stats[9] += effectDef.shieldBreak;
                }
            });
        }
        
        // 更新套裝效果顯示 - 修復了錯誤顯示問題
        function updateSetEffects(type) {
            const containerId = type === 'current' ? 'currentSetEffects' : 'newSetEffects';
            const equipmentConfig = type === 'current' ? currentWearingEquipment : newEquipment;
            
            const setEffects = calculateSetEffects(equipmentConfig);
            let html = '';
            
            // 上半身套裝效果
            if (setEffects.upperSet.effects.length > 0) {
                setEffects.upperSet.effects.forEach(effect => {
                    const levelClass = `level-${effect.level}`;
                    html += `
                        <div class="mb-3 p-3 bg-white bg-opacity-20 rounded-lg border border-blue-100">
                            <div class="flex justify-between items-center">
                                <span class="font-medium text-white">${effect.name}</span>
                                <span class="level-badge ${levelClass}">${effect.level}級</span>
                            </div>
                            <div class="mt-1 text-sm text-white">${effect.value}</div>
                        </div>
                    `;
                });
            } else {
                html += `<div class="text-sm mb-2 text-white"><i class="fas fa-times-circle text-red-500 mr-1"></i>無百鍊套裝效果</div>`;
            }
            
            // 下半身套裝效果
            if (setEffects.lowerSet.effects.length > 0) {
                setEffects.lowerSet.effects.forEach(effect => {
                    const levelClass = `level-${effect.level}`;
                    html += `
                        <div class="mb-3 p-3 bg-white bg-opacity-20 rounded-lg border border-purple-100">
                            <div class="flex justify-between items-center">
                                <span class="font-medium text-white">${effect.name}</span>
                                <span class="level-badge ${levelClass}">${effect.level}級</span>
                            </div>
                            <div class="mt-1 text-sm text-white">${effect.value}</div>
                        </div>
                    `;
                });
            } else {
                html += `<div class="text-sm text-white"><i class="fas fa-times-circle text-red-500 mr-1"></i>無百鍊飾品套裝效果</div>`;
            }
            
            // 獨珍效果顯示
            if (setEffects.uniqueEffects.length > 0) {
                html += `<div class="mt-4 pt-4 border-t border-gray-200"><h4 class="font-medium mb-2 text-white">獨珍效果</h4>`;
                setEffects.uniqueEffects.forEach(unique => {
                    let effectText = '';
                    const effect = unique.effect;
                    
                    if (effect.attack) effectText += `攻擊 +${effect.attack}, `;
                    if (effect.elementalAttack) effectText += `元素攻擊 +${effect.elementalAttack}, `;
                    if (effect.armorBreak) effectText += `破防 +${effect.armorBreak}, `;
                    if (effect.ignoreResist) effectText += `忽視抗性 +${effect.ignoreResist}, `;
                    if (effect.hit) effectText += `命中 +${effect.hit}, `;
                    if (effect.crit) effectText += `會心 +${effect.crit}, `;
                    if (effect.bossDamage) effectText += `首領克制 +${effect.bossDamage}, `;
                    if (effect.bossDamagePercent) effectText += `首領克制 +${(effect.bossDamagePercent * 100).toFixed(1)}%, `;
                    if (effect.critDamage) effectText += `會心傷害 +${(effect.critDamage * 100).toFixed(1)}%, `;
                    if (effect.shieldBreak) effectText += `破盾 +${effect.shieldBreak}, `;
                    
                    // 去掉最後的逗號和空格
                    if (effectText.length > 0) {
                        effectText = effectText.slice(0, -2);
                    }
                    
                    html += `
                        <div class="mb-3 p-3 bg-white bg-opacity-20 rounded-lg border border-yellow-200">
                            <div class="flex justify-between items-center">
                                <span class="font-medium text-white">${unique.name}</span>
                                <span class="unique-badge">獨珍</span>
                            </div>
                            <div class="mt-1 text-sm text-white">${effectText}</div>
                        </div>
                    `;
                });
                html += `</div>`;
            } else {
                html += `<div class="mt-4 pt-4 border-t border-gray-200 text-sm text-white"><i class="fas fa-times-circle text-red-500 mr-1"></i>無獨珍效果</div>`;
            }
            
            document.getElementById(containerId).innerHTML = html;
        }

        // 應用五維屬性轉換
        function applyFiveStatsConversion(stats) {
            // 檢查是否選擇了主職業
            if (!selectedMainProfession) {
                return; // 如果沒有選擇職業，不進行轉換
            }
            
            const professionType = PROFESSION_TYPES["內功"].includes(selectedMainProfession) ? "內功" : "外功";
            
            const strength = stats[10]; // 力量
            const qihai = stats[11]; // 氣海
            const agility = stats[12]; // 身法
            const constitution = stats[13]; // 根骨
            const endurance = stats[14]; // 耐力

            // 基礎五維轉換（根據職業類型）
            if (professionType === "外功") {
                // 外功職業：力量、身法、根骨、耐力
                if (strength > 0) {
                    stats[0] += strength * FIVE_STATS_CONVERSION["力量"]["攻擊"]; // 攻擊
                    stats[2] += strength * FIVE_STATS_CONVERSION["力量"]["破防"]; // 破防
                }
            } else {
                // 內功職業：氣海、身法、根骨、耐力
                if (qihai > 0) {
                    stats[0] += qihai * FIVE_STATS_CONVERSION["氣海"]["攻擊"]; // 攻擊
                    stats[2] += qihai * FIVE_STATS_CONVERSION["氣海"]["破防"]; // 破防
                }
            }

            // 身法轉換（所有職業都有）
            if (agility > 0) {
                stats[5] += agility * FIVE_STATS_CONVERSION["身法"]["會心"]; // 會心
                stats[4] += agility * FIVE_STATS_CONVERSION["身法"]["命中"]; // 命中
            }

            // 應用主職業特殊轉換
            applyProfessionConversion(stats, selectedMainProfession);
            
            // 應用特質轉換
            if (selectedTrait) {
                applyProfessionConversion(stats, selectedTrait, true);
            }
        }

        // 應用職業特殊轉換
        function applyProfessionConversion(stats, profession, isTrait = false) {
            if (!profession) {
                return;
            }
            
            let conversions = PROFESSION_CONVERSION[profession];
            
            // 特殊規則處理：主職業為外功且特質為神相時
            if (isTrait && selectedMainProfession && PROFESSION_TYPES["外功"].includes(selectedMainProfession) && 
                profession === "神相") {
                conversions = {"力量": {"命中": 0.83}};
            }
            
            if (!conversions) {
                return;
            }
            
            Object.keys(conversions).forEach(statName => {
                let statIndex;
                switch(statName) {
                    case "力量": statIndex = 10; break;
                    case "氣海": statIndex = 11; break;
                    case "身法": statIndex = 12; break;
                    case "根骨": statIndex = 13; break;
                    case "耐力": statIndex = 14; break;
                    default: return;
                }
                
                const statValue = stats[statIndex];
                if (statValue > 0) {
                    const targetStats = conversions[statName];
                    Object.keys(targetStats).forEach(targetStat => {
                        let targetIndex;
                        switch(targetStat) {
                            case "攻擊": targetIndex = 0; break;
                            case "破防": targetIndex = 2; break;
                            case "命中": targetIndex = 4; break;
                            case "會心": targetIndex = 5; break;
                            default: return;
                        }
                        
                        stats[targetIndex] += statValue * targetStats[targetStat];
                    });
                }
            });
        }

        // 計算基礎面板
        function calculateBaseStats() {
            // 獲取當前總屬性（包含五維轉換後的結果）
            const currentTotalStats = {
                attack: parseFloat(document.getElementById('current_attack').value) || 0,
                elementalAttack: parseFloat(document.getElementById('current_elemental_attack').value) || 0,
                armorBreak: parseFloat(document.getElementById('current_armor_break').value) || 0,
                ignoreResist: parseFloat(document.getElementById('current_ignore_resist').value) || 0,
                hit: parseFloat(document.getElementById('current_hit').value) || 0,
                crit: parseFloat(document.getElementById('current_crit').value) || 0,
                bossDamage: parseFloat(document.getElementById('current_boss_damage').value) || 0,
                bossDamagePercent: (parseFloat(document.getElementById('current_boss_damage_percent').value) || 0)/100,
                critDamage: (parseFloat(document.getElementById('current_crit_damage').value) || 0)/100,
                shieldBreak: parseFloat(document.getElementById('current_shield_break').value) || 0,
                strength: parseFloat(document.getElementById('current_strength').value) || 0,
                qihai: parseFloat(document.getElementById('current_qihai').value) || 0,
                agility: parseFloat(document.getElementById('current_agility').value) || 0,
                constitution: parseFloat(document.getElementById('current_constitution').value) || 0,
                endurance: parseFloat(document.getElementById('current_endurance').value) || 0
            };
            
            // 計算當前穿戴裝備的屬性
            const currentEquipmentStats = new Array(15).fill(0);
            
            EQUIPMENT_SLOTS.forEach(slot => {
                const selectedItem = currentWearingEquipment[slot];
                if (selectedItem && EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem]) {
                    const itemStats = EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem];
                    for (let i = 0; i < itemStats.length; i++) {
                        currentEquipmentStats[i] += itemStats[i];
                    }
                }
            });
            
            // 計算套裝效果
            const currentSetEffects = calculateSetEffects(currentWearingEquipment);
            
            const totalFiveStats = {
                strength: currentTotalStats.strength,
                qihai:    currentTotalStats.qihai,
                agility:  currentTotalStats.agility,
                constitution: currentTotalStats.constitution,  // 120 → 攻擊加成正確
                endurance:    currentTotalStats.endurance
            };
                     
            // 應用套裝效果到裝備屬性
            applySetEffects(currentEquipmentStats, currentSetEffects, totalFiveStats);
            
            // 應用五維屬性轉換
            applyFiveStatsConversion(currentEquipmentStats);
            
            // 計算基礎面板 = 當前總屬性 - 當前裝備屬性 - 當前內功屬性
            for (let i = 0; i < 15; i++) {
                baseStats[i] = currentTotalStats[Object.keys(currentTotalStats)[i]] - currentEquipmentStats[i] - currentInnerStats[i];
            }
            
            // 顯示基礎面板
            displayBaseStats();
        }
        
        // 顯示基礎面板
        function displayBaseStats() {
            const baseStatsDiv = document.getElementById('baseStatsDisplay');
            
            const statLabels = [
                '攻擊', '元素攻擊', '破防', '忽視抗性', '命中', '會心', '首領克制', 
                '首領克制%', '會心傷害', '破盾', '力量', '氣海', '身法', '根骨', '耐力'
            ];
            
            let html = '<div class="grid grid-cols-2 gap-1">';
            for (let i = 0; i < 15; i++) {
                const value = i === 7 || i === 8 ? 
                    `${(baseStats[i] * 100).toFixed(2)}%` : 
                    Math.round(baseStats[i]);
                html += `<div class="text-xs">${statLabels[i]}: <span class="font-medium">${value}</span></div>`;
            }
            html += '</div>';
            
            baseStatsDiv.innerHTML = html;
            
            // 添加動畫效果
            baseStatsDiv.classList.add('fade-in');
            setTimeout(() => {
                baseStatsDiv.classList.remove('fade-in');
            }, 500);
        }
        
        // 計算新裝備屬性
        function calculateNewEquipmentStats() {
            // 計算新裝備的屬性
            const newEquipmentStats = new Array(15).fill(0);
            
            EQUIPMENT_SLOTS.forEach(slot => {
                const selectedItem = newEquipment[slot];
                if (selectedItem && EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem]) {
                    const itemStats = EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem];
                    for (let i = 0; i < itemStats.length; i++) {
                        newEquipmentStats[i] += itemStats[i];
                    }
                }
            });
            
            // 計算套裝效果
            const newSetEffects = calculateSetEffects(newEquipment);
            
            // 計算五維總值（基礎面板 + 新裝備）
            const totalFiveStats = {
                strength: baseStats[10] + newEquipmentStats[10],
                qihai: baseStats[11] + newEquipmentStats[11],
                agility: baseStats[12] + newEquipmentStats[12],
                constitution: baseStats[13] + newEquipmentStats[13],
                endurance: baseStats[14] + newEquipmentStats[14]
            };
            
            // 應用套裝效果到裝備屬性
            applySetEffects(newEquipmentStats, newSetEffects, totalFiveStats);
            
            
            // 應用五維屬性轉換
            applyFiveStatsConversion(newEquipmentStats);
            
            // 顯示新裝備屬性
            displayNewEquipmentStats(newEquipmentStats);
        }
        
        // 顯示新裝備屬性
        function displayNewEquipmentStats(stats) {
            const newEquipmentStatsDiv = document.getElementById('newEquipmentStatsDisplay');
            
            // 計算當前裝備屬性用於對比
            const currentEquipmentStats = new Array(15).fill(0);
            
            EQUIPMENT_SLOTS.forEach(slot => {
                const selectedItem = currentWearingEquipment[slot];
                if (selectedItem && EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem]) {
                    const itemStats = EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem];
                    for (let i = 0; i < itemStats.length; i++) {
                        currentEquipmentStats[i] += itemStats[i];
                    }
                }
            });
            
            // 計算當前裝備套裝效果
            const currentSetEffects = calculateSetEffects(currentWearingEquipment);
            
            // 計算五維總值（基礎面板 + 裝備）
            const totalFiveStats = {
                strength: baseStats[10] + currentEquipmentStats[10],
                qihai: baseStats[11] + currentEquipmentStats[11],
                agility: baseStats[12] + currentEquipmentStats[12],
                constitution: baseStats[13] + currentEquipmentStats[13],
                endurance: baseStats[14] + currentEquipmentStats[14]
            };
            
            // 應用套裝效果到裝備屬性
            applySetEffects(currentEquipmentStats, currentSetEffects, totalFiveStats);
            
            // 應用五維屬性轉換
            applyFiveStatsConversion(currentEquipmentStats);
            
            const statLabels = [
                '攻擊', '元素攻擊', '破防', '忽視抗性', '命中', '會心', '首領克制', 
                '首領克制%', '會心傷害', '破盾', '力量', '氣海', '身法', '根骨', '耐力'
            ];
            
            let html = '<div class="space-y-1 max-h-80 overflow-y-auto pr-2">';
            for (let i = 0; i < 15; i++) {
                const newValue = i === 7 || i === 8 ? stats[i] * 100 : stats[i];
                const currentValue = i === 7 || i === 8 ? currentEquipmentStats[i] * 100 : currentEquipmentStats[i];
                const diff = newValue - currentValue;
                
                const diffColor = diff > 0 ? 'text-green-300' : diff < 0 ? 'text-red-300' : 'text-gray-300';
                const diffSign = diff > 0 ? '+' : '';
                const diffText = i === 7 || i === 8 ? 
                    `${diffSign}${diff.toFixed(2)}%` : 
                    `${diffSign}${Math.round(diff)}`;
                
                const newValueText = i === 7 || i === 8 ? 
                    `${newValue.toFixed(2)}%` : 
                    Math.round(newValue);
                
                const icon = diff > 0 ? 'fa-arrow-up text-green-300' : 
                            diff < 0 ? 'fa-arrow-down text-red-300' : 'fa-equals text-gray-300';
                
                html += `
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-white">${statLabels[i]}:</span>
                        <div class="flex items-center space-x-2">
                            <span class="font-medium text-white">${newValueText}</span>
                            <span class="${diffColor}"><i class="fas ${icon} mr-1"></i>(${diffText})</span>
                        </div>
                    </div>
                `;
            }
            html += '</div>';
            
            newEquipmentStatsDiv.innerHTML = html;
            
            // 添加動畫效果
            newEquipmentStatsDiv.classList.add('fade-in');
            setTimeout(() => {
                newEquipmentStatsDiv.classList.remove('fade-in');
            }, 500);
        }

        // 傷害計算功能
        function calculateDamage() {
            const targetSelect = document.getElementById('targetSelect');
            const selectedTarget = targetSelect.value;
            
            if (!selectedTarget || !TARGET_PRESETS[selectedTarget]) {
                alert('請先選擇目標！');
                return;
            }
            
            // 檢查是否已計算基礎面板
            if (baseStats.every(stat => stat === 0)) {
                alert('請先計算基礎面板！');
                return;
            }
            
            const targetStats = TARGET_PRESETS[selectedTarget];
            
            try {
                // 計算當前總屬性 (基礎面板 + 當前裝備 + 當前內功)
                const currentEquipmentStats = new Array(15).fill(0);
                
                EQUIPMENT_SLOTS.forEach(slot => {
                    const selectedItem = currentWearingEquipment[slot];
                    if (selectedItem && EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem]) {
                        const itemStats = EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem];
                        for (let i = 0; i < itemStats.length; i++) {
                            currentEquipmentStats[i] += itemStats[i];
                        }
                    }
                });
                
                // 計算當前裝備套裝效果
                const currentSetEffects = calculateSetEffects(currentWearingEquipment);
                
                const totalFiveStatsCurrent = {
                    strength: baseStats[10] + currentEquipmentStats[10],
                    qihai:    baseStats[11] + currentEquipmentStats[11],
                    agility:  baseStats[12] + currentEquipmentStats[12],
                    constitution: baseStats[13] + currentEquipmentStats[13],
                    endurance:    baseStats[14] + currentEquipmentStats[14]
                };
                
                // 應用套裝效果到裝備屬性
                applySetEffects(currentEquipmentStats, currentSetEffects);
                
                // 應用五維屬性轉換
                applyFiveStatsConversion(currentEquipmentStats);
                
                const currentTotalStats = {
                    attack: baseStats[0] + currentEquipmentStats[0] + currentInnerStats[0],
                    elementalAttack: baseStats[1] + currentEquipmentStats[1] + currentInnerStats[1],
                    armorBreak: baseStats[2] + currentEquipmentStats[2] + currentInnerStats[2],
                    ignoreResist: baseStats[3] + currentEquipmentStats[3] + currentInnerStats[3],
                    hit: baseStats[4] + currentEquipmentStats[4] + currentInnerStats[4],
                    crit: baseStats[5] + currentEquipmentStats[5] + currentInnerStats[5],
                    bossDamage: baseStats[6] + currentEquipmentStats[6] + currentInnerStats[6],
                    bossDamagePercent: baseStats[7] + currentEquipmentStats[7] + currentInnerStats[7],
                    critDamage: baseStats[8] + currentEquipmentStats[8] + currentInnerStats[8],
                    shieldBreak: baseStats[9] + currentEquipmentStats[9] + currentInnerStats[9]
                };
                
                // 計算新裝備總屬性 (基礎面板 + 新裝備 + 新內功 + 手動調整)
                const newEquipmentStats = new Array(15).fill(0);
                
                EQUIPMENT_SLOTS.forEach(slot => {
                    const selectedItem = newEquipment[slot];
                    if (selectedItem && EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem]) {
                        const itemStats = EQUIPMENT_PRESETS_BY_SLOT[slot][selectedItem];
                        for (let i = 0; i < itemStats.length; i++) {
                            newEquipmentStats[i] += itemStats[i];
                        }
                    }
                });
                
                // 計算新裝備套裝效果
                const newSetEffects = calculateSetEffects(newEquipment);
                
                // 應用套裝效果到裝備屬性
                applySetEffects(newEquipmentStats, newSetEffects);
                
                // 應用五維屬性轉換
                applyFiveStatsConversion(newEquipmentStats);
                
                // 獲取手動調整值
                const manualAdjustments = {
                    attack: parseFloat(document.getElementById('manual_attack').value) || 0,
                    elementalAttack: parseFloat(document.getElementById('manual_elemental_attack').value) || 0,
                    armorBreak: parseFloat(document.getElementById('manual_armor_break').value) || 0,
                    ignoreResist: parseFloat(document.getElementById('manual_ignore_resist').value) || 0,
                    hit: parseFloat(document.getElementById('manual_hit').value) || 0,
                    crit: parseFloat(document.getElementById('manual_crit').value) || 0,
                    bossDamage: parseFloat(document.getElementById('manual_boss_damage').value) || 0,
                    bossDamagePercent: (parseFloat(document.getElementById('manual_boss_damage_percent').value) || 0),
                    critDamage: (parseFloat(document.getElementById('manual_crit_damage').value) || 0),
                    shieldBreak: 0,
                    strength: parseFloat(document.getElementById('manual_strength').value) || 0,
                    qihai: parseFloat(document.getElementById('manual_qihai').value) || 0,
                    agility: parseFloat(document.getElementById('manual_agility').value) || 0,
                    constitution: parseFloat(document.getElementById('manual_constitution').value) || 0,
                    endurance: parseFloat(document.getElementById('manual_endurance').value) || 0
                };
                
                // 將手動微調的五維屬性轉換為戰鬥屬性
                const manualFiveStatsArray = new Array(15).fill(0);
                manualFiveStatsArray[10] = manualAdjustments.strength;
                manualFiveStatsArray[11] = manualAdjustments.qihai;
                manualFiveStatsArray[12] = manualAdjustments.agility;
                manualFiveStatsArray[13] = manualAdjustments.constitution;
                manualFiveStatsArray[14] = manualAdjustments.endurance;

                // 應用五維轉換
                applyFiveStatsConversion(manualFiveStatsArray);
                
                // 計算新配置總屬性（包含手動調整）
                const newTotalStats = {
                    attack: baseStats[0] + newEquipmentStats[0] + newInnerStats[0] + manualAdjustments.attack + manualFiveStatsArray[0],
                    elementalAttack: baseStats[1] + newEquipmentStats[1] + newInnerStats[1] + manualAdjustments.elementalAttack + manualFiveStatsArray[1],
                    armorBreak: baseStats[2] + newEquipmentStats[2] + newInnerStats[2] + manualAdjustments.armorBreak + manualFiveStatsArray[2],
                    ignoreResist: baseStats[3] + newEquipmentStats[3] + newInnerStats[3] + manualAdjustments.ignoreResist + manualFiveStatsArray[3],
                    hit: baseStats[4] + newEquipmentStats[4] + newInnerStats[4] + manualAdjustments.hit + manualFiveStatsArray[4],
                    crit: baseStats[5] + newEquipmentStats[5] + newInnerStats[5] + manualAdjustments.crit + manualFiveStatsArray[5],
                    bossDamage: baseStats[6] + newEquipmentStats[6] + newInnerStats[6] + manualAdjustments.bossDamage + manualFiveStatsArray[6],
                    bossDamagePercent: baseStats[7] + newEquipmentStats[7] + newInnerStats[7] + (manualAdjustments.bossDamagePercent / 100) + manualFiveStatsArray[7],
                    critDamage: baseStats[8] + newEquipmentStats[8] + newInnerStats[8] + (manualAdjustments.critDamage / 100) + manualFiveStatsArray[8],
                    shieldBreak: baseStats[9] + newEquipmentStats[9] + newInnerStats[9] + manualAdjustments.shieldBreak + manualFiveStatsArray[9]
                };
                
                // 計算傷害
                const currentDamage = calculateSingleDamage(currentTotalStats, targetStats);
                const newDamage = calculateSingleDamage(newTotalStats, targetStats);
                
                // 計算差異
                const damageDiff = newDamage - currentDamage;
                const damageIncrease = currentDamage > 0 ? (damageDiff / currentDamage * 100) : 0;
                
                // 顯示結果
                displayDamageResults(currentDamage, newDamage, damageDiff, damageIncrease);
            } catch (error) {
                console.error('計算傷害時發生錯誤:', error);
                alert('計算傷害時發生錯誤，請檢查輸入值');
            }
        }
        
        function calculateSingleDamage(stats, targetStats) {
            // 固定值
            const BASE_SKILL = 0;
            const SKILL_ENHANCE = 0;
            const ATTACK_SPEED = 0;
            const BOSS_RESIST = 0; // 首領抵禦
            
            // 防禦穿透率計算
            const defenseAfterBreak = Math.max(0, targetStats.defense - stats.armorBreak);
            const defensePenetration = 1 - (defenseAfterBreak / (defenseAfterBreak + 2860));
            
            // 元素穿透率計算
            const elementalResistAfterIgnore = Math.max(0, targetStats.elemental_resist - stats.ignoreResist);
            const elementalPenetration = 1 - (elementalResistAfterIgnore / (elementalResistAfterIgnore + 520));
            
            // 真實命中計算
            const realHit = (1.4315 * stats.hit) / (stats.hit + 714);
            
            // 真實格擋計算
            const realBlock = (1.44 * targetStats.block) / (targetStats.block + 722);
            
            // 命中率計算
            const hitRate = Math.min(1, Math.max(0, 0.95 + (realHit - realBlock)));
            
            // 會心率計算
            const critDiff = Math.max(0, stats.crit - targetStats.crit_resist + 90);
            const critRate = Math.min(1, Math.max(0, (1.15 * critDiff) / (critDiff + 941)));
            
            // 傷害計算
            const physicalDamage = (stats.attack + stats.bossDamage - BOSS_RESIST - targetStats.shield_base + BASE_SKILL) * defensePenetration;
            const elementalDamage = stats.elementalAttack * elementalPenetration;
            
            const baseDamage = physicalDamage + elementalDamage;
            
            const hitMultiplier = hitRate * (critRate * stats.critDamage + (1 - critRate)) + (1 - hitRate) * 0.5;
            const bossMultiplier = 1 + stats.bossDamagePercent;
            const skillMultiplier = 1 + SKILL_ENHANCE;
            const speedMultiplier = 1 + ATTACK_SPEED / 2;
            
            const finalDamage = baseDamage * hitMultiplier * bossMultiplier * skillMultiplier * speedMultiplier;
            
            return Math.max(0, finalDamage);
        }
        
        function displayDamageResults(currentDamage, newDamage, damageDiff, damageIncrease) {
            const resultsDiv = document.getElementById('damageResults');
            
            const diffColor = damageDiff >= 0 ? 'text-green-300' : 'text-red-500';
            const diffBg = damageDiff >= 0 ? 'bg-green-900 bg-opacity-20 border-green-300' : 'bg-red-900 bg-opacity-20 border-red-700';
            const diffSign = damageDiff >= 0 ? '+' : '';
            
            const increaseColor = damageIncrease >= 0 ? 'text-green-300' : 'text-red-500';
            const increaseBg = damageIncrease >= 0 ? 'bg-green-900 bg-opacity-20 border-green-300' : 'bg-red-900 bg-opacity-20 border-red-700';
            const increaseSign = damageIncrease >= 0 ? '+' : '';
            
            const damageClass = damageDiff >= 0 ? 'damage-increase' : 'damage-decrease';
            
            resultsDiv.innerHTML = `
                <div class="space-y-3 fade-in">
                    <div class="${damageClass} damage-result-card ${diffBg}">
                        <div class="flex justify-between items-center">
                            <div>
                                <div class="text-xs mb-1 text-white">傷害差異</div>
                                <div class="text-xl font-bold ${diffColor}">${diffSign}${Math.round(damageDiff).toLocaleString()}</div>
                            </div>
                            <div class="text-3xl ${diffColor}">
                                ${damageDiff >= 0 ? '📈' : '📉'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-blue-900 bg-opacity-20 p-3 rounded-lg border border-blue-300">
                            <div class="text-xs mb-1 text-white">當前配置傷害</div>
                            <div class="text-lg font-bold text-white">${Math.round(currentDamage).toLocaleString()}</div>
                        </div>
                        
                        <div class="bg-purple-900 bg-opacity-20 p-3 rounded-lg border border-purple-300">
                            <div class="text-xs mb-1 text-white">新配置傷害</div>
                            <div class="text-lg font-bold text-white">${Math.round(newDamage).toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <div class="${increaseBg} p-3 rounded-lg border">
                        <div class="text-xs mb-1 text-white">增傷百分比</div>
                        <div class="text-lg font-bold ${increaseColor}">${increaseSign}${damageIncrease.toFixed(2)}%</div>
                    </div>
                </div>
            `;
            
            // 添加動畫效果
            setTimeout(() => {
                resultsDiv.querySelector('.fade-in').classList.remove('fade-in');
            }, 500);
        }

        // 頁面載入時初始化
        document.addEventListener('DOMContentLoaded', function() {
            loadExternalData();
            createStars();
        });
        
        //星星動畫效果
        function createStars() {
            const starsContainer = document.getElementById('stars');
            const starCount = 400; // 星星數量

            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                const size = Math.random() * 3 + 0.5;
                const opacity = Math.random() * 0.8 + 0.2;
                star.style.cssText = `
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    width: ${size}px;
                    height: ${size}px;
                    opacity: ${opacity};
                    animation-delay: ${Math.random() * 4}s;
                    animation-duration: ${Math.random() * 4 + 2}s;
                `;
                starsContainer.appendChild(star);
            }
        }
    