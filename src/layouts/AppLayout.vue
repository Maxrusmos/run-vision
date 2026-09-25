<template>
  <v-app>
    <v-app-bar flat border="bottom">
      <v-app-bar-title> RunVision </v-app-bar-title>
      <v-spacer />
      <v-btn to="/activities" variant="text"> Пробежки </v-btn>
      <v-btn to="/settings" variant="text"> Настройки </v-btn>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
