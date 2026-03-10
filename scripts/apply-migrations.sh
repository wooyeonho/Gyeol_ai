#!/bin/bash
# Supabase 마이그레이션 적용
# 사용법: ./scripts/apply-migrations.sh
# 또는: Supabase Dashboard > SQL Editor에서 migrations/*.sql 순서대로 실행

set -e
MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"

echo "=== GYEOL 마이그레이션 ==="
echo "Supabase Dashboard > SQL Editor에서 아래 파일을 순서대로 실행하세요:"
echo ""

for f in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$f" ] && echo "  - $(basename "$f")"
done

echo ""
echo "또는 Supabase CLI가 설치되어 있다면:"
echo "  supabase db push"
echo ""
