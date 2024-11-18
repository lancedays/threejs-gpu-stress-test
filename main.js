// Import THREE.js and required modules
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

class GPUStressTest {
    // Inital Configuration options
    static CONFIG = {
        INITIAL_OBJECTS: 3000,
        BATCH_SIZE: 1000,
        INITIAL_LIGHT_INTENSITY: 1000,
        INITIAL_CAMERA_DISTANCE: 50,
        INITIAL_AUTO_ROTATE_SPEED: 0.1,
        LIGHTS_COUNT: 5,
        BLOOM_STRENGTH: 0.5,
        BLOOM_RADIUS: 2.0,
        BLOOM_THRESHOLD: 0.35,
        DAMPING_FACTOR: 0.05,
        LIGHT_DISTANCE: 50,
        OBJECT_ROTATION_SPEED: 0.02
    };

    constructor() {
        this.stats = {
            drawCalls: 0,
            triangles: 0,
            memory: 0,
            frameCount: 0,
            lastTime: performance.now()
        };

        this.objects = [];
        this.lights = [];
        this.objectsRotating = true;
        this.isWireframe = false;
        this.areLightsDynamic = true;
        this.lightIntensity = GPUStressTest.CONFIG.INITIAL_LIGHT_INTENSITY;

        this.initScene();
        this.initPostProcessing();
        this.initControls();
        this.createLights();
        this.setupEventListeners();

        this.addBatch(GPUStressTest.CONFIG.INITIAL_OBJECTS);
        this.animate();
    }

    updateObjectRotationSpeed(value) {
        const speed = value * GPUStressTest.CONFIG.OBJECT_ROTATION_SPEED;
        this.objects.forEach(obj => {
            obj.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * speed,
                y: (Math.random() - 0.5) * speed,
                z: (Math.random() - 0.5) * speed
            };
        });
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = GPUStressTest.CONFIG.INITIAL_CAMERA_DISTANCE;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);
    }

    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            GPUStressTest.CONFIG.BLOOM_STRENGTH,
            GPUStressTest.CONFIG.BLOOM_RADIUS,
            GPUStressTest.CONFIG.BLOOM_THRESHOLD
        );
        this.composer.addPass(this.bloomPass);
        this.bloomPass.enabled = false;

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = GPUStressTest.CONFIG.DAMPING_FACTOR;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = GPUStressTest.CONFIG.INITIAL_AUTO_ROTATE_SPEED;
    }

    createLights() {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
        for (let i = 0; i < GPUStressTest.CONFIG.LIGHTS_COUNT; i++) {
            const light = new THREE.PointLight(colors[i], this.lightIntensity, GPUStressTest.CONFIG.LIGHT_DISTANCE);
            light.position.set(
                Math.random() * 40 - 20,
                Math.random() * 40 - 20,
                Math.random() * 40 - 20
            );
            this.scene.add(light);
            this.lights.push(light);

            // Add visible sphere for each light source
            const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
            const sphereMaterial = new THREE.MeshBasicMaterial({ color: colors[i] });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            light.add(sphere);
        }
    }

    createObject() {
        const geometries = [
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.TetrahedronGeometry(0.5),
            new THREE.TorusGeometry(0.5, 0.2, 16, 32),
            new THREE.OctahedronGeometry(0.5)
        ];

        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const material = new THREE.MeshPhongMaterial({
            color: Math.random() * 0xffffff,
            shininess: 100,
            specular: 0x444444
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            Math.random() * 100 - 50,
            Math.random() * 100 - 50,
            Math.random() * 100 - 50
        );
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        mesh.userData.rotationSpeed = {
            x: (Math.random() - 0.5) * GPUStressTest.CONFIG.OBJECT_ROTATION_SPEED,
            y: (Math.random() - 0.5) * GPUStressTest.CONFIG.OBJECT_ROTATION_SPEED,
            z: (Math.random() - 0.5) * GPUStressTest.CONFIG.OBJECT_ROTATION_SPEED
        };
        this.scene.add(mesh);
        this.objects.push(mesh);
    }

    addBatch(batchSize = GPUStressTest.CONFIG.BATCH_SIZE) {
        for (let i = 0; i < batchSize; i++) {
            this.createObject();
        }
        document.getElementById('count').textContent = this.objects.length;
    }

    removeBatch(batchSize = GPUStressTest.CONFIG.BATCH_SIZE) {
        const removeCount = Math.min(batchSize, this.objects.length);
        for (let i = 0; i < removeCount; i++) {
            const object = this.objects.pop();
            this.scene.remove(object);
            object.geometry.dispose();
            object.material.dispose();
        }
        document.getElementById('count').textContent = this.objects.length;
    }

    toggleLights() {
        this.areLightsDynamic = !this.areLightsDynamic;
        const button = document.getElementById('toggleLights');
        button.dataset.active = this.areLightsDynamic.toString();
    }

    toggleBloom() {
        this.bloomPass.enabled = !this.bloomPass.enabled;
        const button = document.getElementById('toggleBloom');
        button.dataset.active = this.bloomPass.enabled.toString();
    }

    toggleWireframe() {
        this.isWireframe = !this.isWireframe;
        this.objects.forEach(obj => {
            obj.material.wireframe = this.isWireframe;
        });
        const button = document.getElementById('toggleWireframe');
        button.dataset.active = this.isWireframe.toString();
    }

    toggleObjectRotation() {
        this.objectsRotating = !this.objectsRotating;
        const button = document.getElementById('toggleObjRotate');
        button.dataset.active = this.objectsRotating.toString();
    }

    toggleCameraRotation() {
        this.controls.autoRotate = !this.controls.autoRotate;
        document.getElementById('toggleRotate').dataset.active = this.controls.autoRotate.toString();
    }

    updateLightIntensity(value) {
        this.lightIntensity = value;
        this.lights.forEach(light => {
            light.intensity = value;
        });
        document.getElementById('intensityValue').textContent = value;
    }

    animate = () => {
        requestAnimationFrame(this.animate);

        // FPS counter
        this.stats.frameCount++;
        const currentTime = performance.now();
        if (currentTime - this.stats.lastTime >= 1000) {
            document.getElementById('fps').textContent = this.stats.frameCount;
            this.stats.frameCount = 0;
            this.stats.lastTime = currentTime;
        }

        // Animate objects
        if (this.objectsRotating) {
            this.objects.forEach(obj => {
                obj.rotation.x += obj.userData.rotationSpeed.x;
                obj.rotation.y += obj.userData.rotationSpeed.y;
                obj.rotation.z += obj.userData.rotationSpeed.z;
            });
        }

        // Animate lights
        if (this.areLightsDynamic) {
            const time = Date.now() * 0.001;
            this.lights.forEach((light, i) => {
                light.position.x = Math.sin(time * 0.7 + i * 2) * 30;
                light.position.y = Math.cos(time * 0.5 + i * 1.5) * 30;
                light.position.z = Math.sin(time * 0.3 + i * 1.2) * 30;
            });
        }

        // Update controls
        this.controls.update();

        // Reset renderer info
        this.renderer.info.reset();

        if (this.bloomPass.enabled) {
            this.stats.triangles = this.objects.reduce((total, obj) => {
                return total + obj.geometry.attributes.position.count;
            }, 0);
            this.stats.drawCalls = this.objects.length + this.lights.length;
            this.renderer.clear();
            this.composer.render();
        } else {
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            this.stats.drawCalls = this.renderer.info.render.calls;
            this.stats.triangles = this.renderer.info.render.triangles;
        }

        // Update memory stats
        this.stats.memory = Math.round(window.performance?.memory?.usedJSHeapSize / 1048576) || 0;

        // Update display
        document.getElementById('drawCalls').textContent = this.stats.drawCalls;
        document.getElementById('triangles').textContent = this.stats.triangles;
        document.getElementById('memory').textContent = `${this.stats.memory} MB`;
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });

        // Button controls
        document.getElementById('addBatch').addEventListener('click', () => this.addBatch());
        document.getElementById('removeBatch').addEventListener('click', () => this.removeBatch());
        document.getElementById('toggleLights').addEventListener('click', () => this.toggleLights());
        document.getElementById('toggleBloom').addEventListener('click', () => this.toggleBloom());
        document.getElementById('toggleWireframe').addEventListener('click', () => this.toggleWireframe());
        document.getElementById('toggleRotate').addEventListener('click', () => this.toggleCameraRotation());

        // Slider controls
        document.getElementById('lightIntensity').addEventListener('input',
            e => this.updateLightIntensity(Number(e.target.value)));
        document.getElementById('cameraDistance').addEventListener('input',
            e => this.camera.position.setLength(Number(e.target.value)));
        document.getElementById('cameraSpeed').addEventListener('input',
            e => this.controls.autoRotateSpeed = Number(e.target.value) * 10);
        document.getElementById('rotationSpeed').addEventListener('input',
            e => this.updateObjectRotationSpeed(Number(e.target.value)));
        document.getElementById('toggleObjRotate').addEventListener('click',
            () => this.toggleObjectRotation());

        // Set initial values
        document.getElementById('intensityValue').textContent = this.lightIntensity;
    }
}

// Start the application
new GPUStressTest();