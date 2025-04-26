const GRID_WIDTH = 6;
const GRID_HEIGHT = 10;
const CELL_SIZE = 50;
const SCREEN_WIDTH = GRID_WIDTH * CELL_SIZE;
const SCREEN_HEIGHT = GRID_HEIGHT * CELL_SIZE;
const COLORS = [
    0xcc3333, // 어두운 빨강
    0x33cc33, // 어두운 초록
    0x3333cc  // 어두운 파랑
];

class Box extends Phaser.GameObjects.Container {
    constructor(scene, x, y, number, color) {
        super(scene, x, y);

        // 박스 사각형
        this.boxRect = scene.add.rectangle(0, 0, CELL_SIZE, CELL_SIZE, color);
        
        // 숫자 텍스트
        this.text = scene.add.text(0, 0, number.toString(), {
            fontSize: '28px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold', // 볼드 추가!
            stroke: '#000000', // 외곽선
            strokeThickness: 4, // 외곽선 두께
        }).setOrigin(0.5);

        this.number = number;
        this.colorValue = color;

        this.add(this.boxRect);
        this.add(this.text);
        
        scene.add.existing(this);
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    destroyBox() {
        this.destroy(); // Container 안에 있는 것들(사각형+텍스트) 같이 삭제됨
    }
}

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.nextQueue = []; // 다음 박스들 저장
        this.previewBoxes = []; // 화면에 그리는 프리뷰 박스들
        this.score = 0;
        this.scoreText = null;
    }

    preload() {}

    create() {
        // 점수 텍스트 표시
        this.scoreText = this.add.text(GRID_WIDTH * CELL_SIZE + 30, 20, 'Score: 0', {
            fontSize: '20px',
            color: '#000000',
            fontFamily: 'Arial',
            fontStyle: 'bold',
        });

        // 게임 격자 생성
        this.grid = Array.from({ length: GRID_WIDTH }, () => Array(GRID_HEIGHT).fill(null));
    
        // ▶ 미리보기 영역 흰색 배경 추가
        const previewBG = this.add.rectangle(
            GRID_WIDTH * CELL_SIZE + 75, // x 위치 (미리보기 중앙)
            SCREEN_HEIGHT / 2,           // y 위치 (가운데 정렬)
            150,                         // 너비
            SCREEN_HEIGHT,              // 높이
            0xffffff                    // 흰색
        );
        previewBG.setOrigin(0.5);
        previewBG.setStrokeStyle(2, 0xaaaaaa); // 회색 테두리도 추가하면 더 깔끔함
    
        // 대기열 먼저 채우기
        for (let i = 0; i < 2; i++) {
            this.nextQueue.push(this.generateRandomBoxData());
        }
        this.drawPreviewBoxes();
    
        // 첫 박스 생성
        this.spawnNewBox();

        this.input.keyboard.on('keydown-LEFT', () => {
            if (this.fallingX > 0 && !this.grid[this.fallingX - 1][this.fallingY]) {
                this.fallingX--;
                this.updateFallingBoxPosition();
            }
        });
        
        this.input.keyboard.on('keydown-RIGHT', () => {
            if (this.fallingX < GRID_WIDTH - 1 && !this.grid[this.fallingX + 1][this.fallingY]) {
                this.fallingX++;
                this.updateFallingBoxPosition();
            }
        });
        
        this.input.keyboard.on('keydown-DOWN', () => {
            if (this.canMoveDown()) {
                this.fallingY++;
                this.updateFallingBoxPosition();
            }
        });
        
        this.input.keyboard.on('keydown-UP', () => {
            while (this.canMoveDown()) {
                this.fallingY++;
            }
            this.updateFallingBoxPosition();
            this.lockBox();
            this.checkAndRemoveGroups();
            this.spawnNewBox();
        });

        this.time.addEvent({
            delay: 800,  // 0.5초마다 한칸 내려오기
            loop: true,
            callback: this.updateFall,
            callbackScope: this,
        });
    }

    updateFallingBoxPosition() {
        this.fallingBox.moveTo(
            this.fallingX * CELL_SIZE + CELL_SIZE/2,
            this.fallingY * CELL_SIZE + CELL_SIZE/2
        );
    }

    spawnNewBox() {
        // [게임 종료 체크]
        if (this.grid[Math.floor(GRID_WIDTH/2)][0]) {
            this.gameOver();
            return;
        }
    
        const data = this.nextQueue.shift(); // 대기열 첫 번째 박스 가져오기
        this.fallingBox = new Box(this, CELL_SIZE/2, CELL_SIZE/2, data.number, data.color);
        this.fallingX = Math.floor(GRID_WIDTH / 2);
        this.fallingY = 0;
        this.updateFallingBoxPosition();
    
        // 새로운 박스 하나 추가
        this.nextQueue.push(this.generateRandomBoxData());
        this.drawPreviewBoxes();
    }

    generateRandomBoxData() {
        return {
            number: Phaser.Math.Between(1, 5),
            color: Phaser.Utils.Array.GetRandom(COLORS)
        };
    }

    drawPreviewBoxes() {
        // 기존 미리보기 박스들 지우기
        this.previewBoxes.forEach(box => box.destroy());
        this.previewBoxes = [];
    
        for (let i = 0; i < this.nextQueue.length; i++) {
            const data = this.nextQueue[i];
            // const previewBox = new Box(this, SCREEN_WIDTH - 100, 100 + i * 80, data.number, data.color);
            const previewBox = new Box(this, GRID_WIDTH * CELL_SIZE + 60, 100 + i * 80, data.number, data.color);
            previewBox.setScale(0.8); // 살짝 작게
            this.previewBoxes.push(previewBox);
        }
    }

    updateFall() {
        if (this.canMoveDown()) {
            this.fallingY++;
            this.fallingBox.moveTo(this.fallingX * CELL_SIZE + CELL_SIZE/2, this.fallingY * CELL_SIZE + CELL_SIZE/2);
        } else {
            this.lockBox();
            this.checkAndRemoveGroups();
            this.spawnNewBox();
        }
    }

    canMoveDown() {
        if (this.fallingY + 1 >= GRID_HEIGHT) return false;
        if (this.grid[this.fallingX][this.fallingY + 1]) return false;
        return true;
    }

    lockBox() {
        this.grid[this.fallingX][this.fallingY] = this.fallingBox;
    }

    checkAndRemoveGroups() {
        let visited = Array.from({ length: GRID_WIDTH }, () => Array(GRID_HEIGHT).fill(false));

        for (let x = 0; x < GRID_WIDTH; x++) {
            for (let y = 0; y < GRID_HEIGHT; y++) {
                if (this.grid[x][y] && !visited[x][y]) {
                    let group = this.findGroup(x, y, visited);
                    let sum = group.reduce((acc, [gx, gy]) => acc + this.grid[gx][gy].number, 0);
                    if (sum > 0 && sum % 10 === 0) {
                        // 점수 계산
                        this.score += group.length * 10;
                        this.scoreText.setText('Score: ' + this.score);
                    
                        // 그룹 삭제
                        group.forEach(([gx, gy]) => {
                            this.grid[gx][gy].destroyBox();
                            this.grid[gx][gy] = null;
                        });
                        this.applyGravity();
                    }
                }
            }
        }
    }

    findGroup(x, y, visited) {
        let stack = [[x, y]];
        let color = this.grid[x][y].colorValue;
        let group = [];

        while (stack.length > 0) {
            let [cx, cy] = stack.pop();
            if (cx >= 0 && cx < GRID_WIDTH && cy >= 0 && cy < GRID_HEIGHT) {
                if (!visited[cx][cy] && this.grid[cx][cy] && this.grid[cx][cy].colorValue === color) {
                    visited[cx][cy] = true;
                    group.push([cx, cy]);
                    stack.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]);
                }
            }
        }

        return group;
    }

    applyGravity() {
        for (let x = 0; x < GRID_WIDTH; x++) {
            let column = this.grid[x].filter(cell => cell !== null);
            let newColumn = Array(GRID_HEIGHT - column.length).fill(null).concat(column);
            this.grid[x] = newColumn;

            for (let y = 0; y < GRID_HEIGHT; y++) {
                if (this.grid[x][y]) {
                    this.grid[x][y].moveTo(x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2);
                }
            }
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: GRID_WIDTH * CELL_SIZE + 150,  // 오른쪽 공간 확보
    height: GRID_HEIGHT * CELL_SIZE,
    backgroundColor: '#000000',
    scene: MainScene,
};

const game = new Phaser.Game(config);