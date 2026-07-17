start=`date +%s`

# Make sure we have the git hooks directory set
git config core.hooksPath .hooks

# lint
pnpm run lint || exit 1

# typescipt checks
pnpm tsc -noEmit || exit 1

# Build the Next.js frontend
pnpm nx build @platform/apps.nodevault || exit 1

# bundle the app
pnpm nx build @platform/apps.api || exit 1

# Clean up
rm -rf ./tmp

end=`date +%s`
runtime=$((end-start))

echo "Build completed successfully in $runtime seconds"

exit 0
