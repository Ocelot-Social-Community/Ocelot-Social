<template>
  <div class="post-teaser-skeleton">
    <div class="skeleton-image" />
    <div class="skeleton-body">
      <div class="skeleton-user">
        <div class="skeleton-avatar" />
        <div class="skeleton-user-text">
          <div class="skeleton-line skeleton-line--short" />
          <div class="skeleton-line skeleton-line--xshort" />
        </div>
      </div>
      <div class="skeleton-title">
        <div class="skeleton-line" />
        <div class="skeleton-line skeleton-line--medium" />
      </div>
      <div class="skeleton-content">
        <div class="skeleton-line" />
        <div class="skeleton-line" />
        <div class="skeleton-line skeleton-line--long" />
      </div>
      <div class="skeleton-footer">
        <div class="skeleton-line skeleton-line--short" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PostTeaserSkeleton',
}
</script>

<style lang="scss">
@keyframes skeleton-pulse {
  0% {
    opacity: 0.15;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 0.15;
  }
}

.post-teaser-skeleton {
  background: #fff;
  border-radius: $border-radius-base;
  box-shadow: $box-shadow-base;
  overflow: hidden;
  height: 100%;
}

.skeleton-image {
  width: 100%;
  padding-bottom: 56%;
  background: currentColor;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skeleton-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-user-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.skeleton-title {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-footer {
  margin-top: 4px;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: currentColor;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  width: 100%;

  &--xshort {
    width: 25%;
  }
  &--short {
    width: 40%;
  }
  &--medium {
    width: 65%;
  }
  &--long {
    width: 85%;
  }
}
</style>
