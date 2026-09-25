<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'

const container = ref<HTMLDivElement | null>(null)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let cube: THREE.Mesh
let animationFrameId = 0

onMounted(() => {
  if (!container.value) {
    return
  }
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)
  camera = new THREE.PerspectiveCamera(
    75,
    container.value.clientWidth / container.value.clientHeight,
    0.1,
    1000,
  )

  camera.position.z = 5

  renderer = new THREE.WebGLRenderer({
    antialias: true,
  })

  renderer.setSize(
    container.value.clientWidth,
    container.value.clientHeight,
  )

  container.value.appendChild(renderer.domElement)
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
  })
  cube = new THREE.Mesh(geometry, material)
  scene.add(cube)
  animate()
})

function animate() {
  animationFrameId = requestAnimationFrame(animate)
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
  renderer.render(scene, camera)
}

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  renderer.dispose()
})
</script>

<template>
  <div ref="container" class="three-container" />
</template>

<style scoped>
.three-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
