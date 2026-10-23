#!/bin/sh
set -eu

psql --set ON_ERROR_STOP=1 \
  --set test_user="$POSTGRES_TEST_USER" \
  --set test_password="$POSTGRES_TEST_PASSWORD" \
  --set test_database="$POSTGRES_TEST_DB" \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'SQL'
  CREATE USER :"test_user" WITH PASSWORD :'test_password';
  CREATE DATABASE :"test_database" OWNER :"test_user";
SQL
