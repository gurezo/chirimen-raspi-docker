import nx from "@nx/eslint-plugin";

export default [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    {
      "ignores": [
        "**/dist",
        "**/out-tsc",
        "**/vite.config.*.timestamp*"
      ]
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.js",
            "**/*.jsx"
        ],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: [
                        "^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"
                    ],
                    depConstraints: [
                        {
                            sourceTag: "type:app",
                            onlyDependOnLibsWithTags: ["type:lib"]
                        },
                        {
                            sourceTag: "type:lib",
                            notDependOnLibsWithTags: ["type:app"]
                        },
                        {
                            sourceTag: "platform:browser",
                            notDependOnLibsWithTags: ["platform:node"]
                        },
                        {
                            sourceTag: "platform:node",
                            notDependOnLibsWithTags: ["platform:browser"]
                        },
                        {
                            sourceTag: "layer:core",
                            onlyDependOnLibsWithTags: []
                        },
                        {
                            sourceTag: "layer:domain",
                            onlyDependOnLibsWithTags: ["layer:core"]
                        },
                        {
                            sourceTag: "layer:protocol",
                            onlyDependOnLibsWithTags: ["layer:core"]
                        },
                        {
                            sourceTag: "scope:node-runtime",
                            onlyDependOnLibsWithTags: [
                                "layer:domain",
                                "layer:core"
                            ]
                        },
                        {
                            sourceTag: "scope:polyfill",
                            onlyDependOnLibsWithTags: [
                                "layer:protocol",
                                "layer:domain",
                                "layer:core"
                            ],
                            notDependOnLibsWithTags: [
                                "scope:node-runtime",
                                "platform:node"
                            ]
                        },
                        {
                            sourceTag: "scope:runtime",
                            onlyDependOnLibsWithTags: [
                                "scope:node-runtime",
                                "scope:shared",
                                "scope:hardware",
                                "layer:protocol",
                                "layer:domain",
                                "layer:core"
                            ]
                        },
                        {
                            sourceTag: "scope:catalog",
                            onlyDependOnLibsWithTags: [],
                            notDependOnLibsWithTags: [
                                "scope:polyfill",
                                "scope:hardware",
                                "scope:node-runtime"
                            ]
                        }
                    ]
                }
            ]
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.cts",
            "**/*.mts",
            "**/*.js",
            "**/*.jsx",
            "**/*.cjs",
            "**/*.mjs"
        ],
        // Override or add rules here
        rules: {}
    }
];
