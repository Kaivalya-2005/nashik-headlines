// =============================================
// SEQUELIZE MODELS - UNIFIED MYSQL DATABASE
// =============================================

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Import sequelize instance
const { sequelize } = require('../config/db');

// ===== USER MODEL =====
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
        validate: { isEmail: true }
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('ADMIN', 'EDITOR'),
        defaultValue: 'EDITOR'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: async (user) => {
            const salt = await bcrypt.genSalt(10);
            user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
    }
});

// Add method to compare password
User.prototype.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password_hash);
};

// ===== SOURCE MODEL (RSS/Scrape Sources) =====
const Source = sequelize.define('Source', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    url: {
        type: DataTypes.STRING(500),
        unique: true,
        allowNull: false
    },
    feed_type: {
        type: DataTypes.ENUM('RSS', 'WEB_SCRAPE'),
        defaultValue: 'RSS'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_scraped_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'sources',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// ===== RAW ARTICLE MODEL =====
const RawArticle = sequelize.define('RawArticle', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    source_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'sources',
            key: 'id'
        }
    },
    url: {
        type: DataTypes.STRING(500),
        unique: true,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    raw_html: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    published_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'raw_articles',
    timestamps: false,
    createdAt: false,
    updatedAt: 'fetched_at' // Override to use fetched_at instead
});

// ===== ARTICLE MODEL (Main Content) =====
const Article = sequelize.define('Article', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    raw_article_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'raw_articles',
            key: 'id'
        }
    },
    external_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    subtitle: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    summary: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    language: {
        type: DataTypes.STRING(10),
        defaultValue: 'mr'
    },
    status: {
        type: DataTypes.ENUM('DRAFT_SCRAPED', 'DRAFT_EDITED', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED'),
        defaultValue: 'DRAFT_SCRAPED'
    },
    generation_status: {
        type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'),
        defaultValue: 'COMPLETED'
    },
    generation_error: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    generation_started_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    generation_completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    focus_keyphrase: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    quote_block: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    source_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    source_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    via_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    via_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    seo_title: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    seo_description: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    seo_slug: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true
    },
    seo_keywords: {
        type: DataTypes.JSON,
        allowNull: true
    },
    seo_score: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    seo_report: {
        type: DataTypes.JSON,
        allowNull: true
    },
    wp_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    wp_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    published_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'articles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// ===== CATEGORY MODEL =====
const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    icon: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'categories',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at'
});

// ===== IMAGE MODEL =====
const Image = sequelize.define('Image', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    article_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'articles',
            key: 'id'
        }
    },
    filename: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    local_path: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    file_size: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('feature', 'context', 'supporting', 'additional'),
        defaultValue: 'feature'
    },
    is_featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    alt_text_marathi: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    alt_text_english: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    caption_marathi: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    caption_english: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    image_prompt: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    generation_method: {
        type: DataTypes.ENUM('SDXL', 'STABILITY_API', 'UNSPLASH', 'UPLOAD', 'PLACEHOLDER'),
        defaultValue: 'UPLOAD'
    },
    wp_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'images',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// ===== TAG MODEL =====
const Tag = sequelize.define('Tag', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false
    },
    frequency: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'tags',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at'
});

// ===== AGENT EXECUTION MODEL =====
const AgentExecution = sequelize.define('AgentExecution', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    execution_type: {
        type: DataTypes.ENUM('SCRAPE', 'PROCESS', 'FULL_PIPELINE'),
        defaultValue: 'SCRAPE'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED', 'STOPPED'),
        defaultValue: 'PENDING'
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    duration_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    articles_scraped: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    articles_processed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    articles_failed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    error_message: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    initiated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    can_pause: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    can_stop: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'agent_executions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// ===== AGENT LOG MODEL =====
const AgentLog = sequelize.define('AgentLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    agent_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    operation: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    raw_article_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'raw_articles',
            key: 'id'
        }
    },
    article_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'articles',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PENDING'),
        defaultValue: 'PENDING'
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    details: {
        type: DataTypes.JSON,
        allowNull: true
    },
    duration_ms: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'agent_logs',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at'
});

// ===== ASSOCIATIONS =====

// User associations
User.hasMany(Article, { foreignKey: 'created_by', as: 'articlesCreated' });
User.hasMany(Article, { foreignKey: 'updated_by', as: 'articlesUpdated' });
User.hasMany(Article, { foreignKey: 'approved_by', as: 'articlesApproved' });
User.hasMany(AgentExecution, { foreignKey: 'initiated_by', as: 'agentExecutions' });

// Article associations
Article.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });
Article.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedByUser' });
Article.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedByUser' });
Article.belongsTo(RawArticle, { foreignKey: 'raw_article_id', as: 'rawArticle' });
Article.hasMany(Image, { foreignKey: 'article_id', as: 'images' });
Article.belongsToMany(Category, { through: 'article_categories', as: 'categories' });
Article.belongsToMany(Tag, { through: 'article_tags', as: 'tags' });

// Source associations
Source.hasMany(RawArticle, { foreignKey: 'source_id', as: 'rawArticles' });

// Category associations
Category.belongsToMany(Article, { through: 'article_categories', as: 'articles' });

// Tag associations
Tag.belongsToMany(Article, { through: 'article_tags', as: 'articles' });

// AgentExecution associations
AgentExecution.belongsTo(User, { foreignKey: 'initiated_by', as: 'initiator' });

module.exports = {
    User,
    Article,
    RawArticle,
    Source,
    Category,
    Image,
    Tag,
    AgentExecution,
    AgentLog,
    sequelize
};
