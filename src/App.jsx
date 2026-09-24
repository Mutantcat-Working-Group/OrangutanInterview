import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ApiOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  ImportOutlined,
  LeftOutlined,
  LinkOutlined,
  PlusOutlined,
  RedoOutlined,
  RightOutlined,
  RobotOutlined,
  RetweetOutlined,
  SearchOutlined,
  SettingOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  clearLocalData,
  DEFAULT_SETTINGS,
  loadQuestions,
  loadSettings,
  saveQuestions,
  saveSettings,
  uid,
} from './store';
import { generateAnswer, testConnection } from './api';

const { Text, Paragraph, Title } = Typography;

const DIFFICULTY_OPTIONS = [
  { label: '简单', value: '简单' },
  { label: '中等', value: '中等' },
  { label: '困难', value: '困难' },
];

const RATING_OPTIONS = [
  { key: 'again', label: '忘记', color: '#dc2626' },
  { key: 'hard', label: '困难', color: '#ea580c' },
  { key: 'good', label: '良好', color: '#0284c7' },
  { key: 'easy', label: '简单', color: '#16a34a' },
];

const SAMPLE_QUESTIONS = [
  {
    text: '解释浏览器从输入 URL 到页面渲染完成，中间经历了哪些关键步骤？',
    category: '浏览器',
    difficulty: '中等',
  },
  {
    text: 'React 中 useState 和 useReducer 分别适合什么场景？为什么？',
    category: 'React',
    difficulty: '中等',
  },
  {
    text: '防抖（debounce）和节流（throttle）有什么区别？各自适用于什么场景？',
    category: 'JavaScript',
    difficulty: '简单',
  },
];

function normalizeBulkItem(item) {
  if (typeof item === 'string') return { text: item.trim() };
  return {
    text: String(item.text || item.question || '').trim(),
    category: item.category || '',
    difficulty: item.difficulty || '',
    source: item.source || '',
  };
}

function parseBulkInput(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { items: [], error: '' };
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed);
      if (!Array.isArray(arr)) return { items: [], error: 'JSON 根节点必须是数组' };
      return { items: arr.map(normalizeBulkItem).filter((i) => i.text), error: '' };
    } catch {
      return { items: [], error: 'JSON 解析失败，请检查格式' };
    }
  }
  const items = trimmed
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim());
      if (parts.length >= 3) {
        return { text: parts[0], category: parts[1], difficulty: parts[2] };
      }
      if (parts.length === 2) {
        return { text: parts[0], category: parts[1] };
      }
      return { text: line };
    });
  return { items, error: '' };
}

function difficultyColor(value) {
  const map = { 简单: 'green', 中等: 'orange', 困难: 'red' };
  return map[value] || 'default';
}

function AppInner() {
  const { message } = AntApp.useApp();
  const [questions, setQuestions] = useState(loadQuestions);
  const [settings, setSettings] = useState(loadSettings);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(undefined);
  const [difficultyFilter, setDifficultyFilter] = useState(undefined);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [deckIds, setDeckIds] = useState([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerLoading, setAnswerLoading] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const abortRef = useRef(null);

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm] = Form.useForm();

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importParseResult, setImportParseResult] = useState(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm] = Form.useForm();
  const apiKeyValue = Form.useWatch('apiKey', settingsForm);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    saveQuestions(questions);
  }, [questions]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const categories = useMemo(() => {
    const set = new Set(questions.map((q) => q.category).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  }, [questions]);

  const answeredCount = useMemo(
    () => questions.filter((q) => q.aiAnswer).length,
    [questions],
  );

  const filteredQuestions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (categoryFilter && q.category !== categoryFilter) return false;
      if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
      if (keyword && !`${q.text} ${q.category} ${q.difficulty}`.toLowerCase().includes(keyword)) {
        return false;
      }
      return true;
    });
  }, [questions, search, categoryFilter, difficultyFilter]);

  const openQuestionModal = useCallback(
    (question) => {
      setEditingQuestion(question || null);
      questionForm.setFieldsValue(
        question
          ? {
              text: question.text,
              category: question.category || '',
              difficulty: question.difficulty || '中等',
              source: question.source || '',
            }
          : { text: '', category: '', difficulty: '中等', source: '' },
      );
      setQuestionModalOpen(true);
    },
    [questionForm],
  );

  const handleQuestionSubmit = () => {
    questionForm.validateFields().then((values) => {
      if (editingQuestion) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === editingQuestion.id
              ? { ...q, ...values, updatedAt: new Date().toISOString() }
              : q,
          ),
        );
        setCurrentQuestion((cur) => (cur && cur.id === editingQuestion.id ? { ...cur, ...values } : cur));
        message.success('题目已更新');
      } else {
        const newQuestion = { id: uid(), ...values, aiAnswer: '', aiGeneratedAt: '', updatedAt: new Date().toISOString() };
        setQuestions((prev) => [...prev, newQuestion]);
        message.success('题目已添加');
      }
      setQuestionModalOpen(false);
    });
  };

  const handleDelete = (question) => {
    setQuestions((prev) => prev.filter((q) => q.id !== question.id));
    if (currentQuestion?.id === question.id) {
      setCurrentQuestion(null);
      setDeckIds([]);
      setDeckIndex(0);
      setAnswerVisible(false);
      setAnswerText('');
      setAnswerError('');
    }
    message.success('已删除');
  };

  const openImportModal = () => {
    setImportText('');
    setImportParseResult(null);
    setImportModalOpen(true);
  };

  const handleImportPreview = () => {
    setImportParseResult(parseBulkInput(importText));
  };

  const handleImportConfirm = () => {
    const result = importParseResult || parseBulkInput(importText);
    if (!result.items.length) {
      message.warning('没有可导入的题目');
      return;
    }
    const newItems = result.items.map((item) => ({
      id: uid(),
      text: item.text,
      category: item.category || '',
      difficulty: item.difficulty || '中等',
      source: item.source || '',
      aiAnswer: '',
      aiGeneratedAt: '',
      updatedAt: new Date().toISOString(),
    }));
    setQuestions((prev) => [...prev, ...newItems]);
    setImportModalOpen(false);
    message.success(`成功导入 ${newItems.length} 道题`);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview-questions.json';
    a.click();
    URL.revokeObjectURL(url);
    message.success('已导出题库文件');
  };

  const loadSamples = () => {
    setQuestions((prev) => [
      ...prev,
      ...SAMPLE_QUESTIONS.map((q) => ({
        id: uid(),
        ...q,
        source: '',
        aiAnswer: '',
        aiGeneratedAt: '',
        updatedAt: new Date().toISOString(),
      })),
    ]);
    message.success('已追加示例题目');
  };

  const resetAnswerView = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAnswerVisible(false);
    setAnswerText('');
    setAnswerError('');
  }, []);

  const startPractice = useCallback(
    (pool) => {
      const source = pool && pool.length ? pool : questions;
      if (!source.length) {
        message.info('题库还是空的，先添加几道题吧');
        return;
      }
      const ids = source.map((q) => q.id);
      for (let i = ids.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      if (currentQuestion && ids.length > 1 && ids[0] === currentQuestion.id) {
        ids.push(ids.shift());
      }
      setDeckIds(ids);
      setDeckIndex(0);
      setCurrentQuestion(source.find((q) => q.id === ids[0]) || null);
      resetAnswerView();
    },
    [questions, currentQuestion, message, resetAnswerView],
  );

  const goToCard = useCallback(
    (index) => {
      if (!deckIds.length) return;
      const clamped = Math.max(0, Math.min(index, deckIds.length - 1));
      setDeckIndex(clamped);
      setCurrentQuestion(questions.find((q) => q.id === deckIds[clamped]) || null);
      resetAnswerView();
    },
    [deckIds, questions, resetAnswerView],
  );

  const applyRating = (rating) => {
    if (!currentQuestion) return;
    const label = RATING_OPTIONS.find((option) => option.key === rating)?.label || rating;
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === currentQuestion.id
          ? { ...q, lastRating: rating, ratingUpdatedAt: new Date().toISOString() }
          : q,
      ),
    );
    message.success(`${label}，下一张`);
    if (deckIndex < deckIds.length - 1) {
      goToCard(deckIndex + 1);
    } else {
      const pool = filteredQuestions.length ? filteredQuestions : questions;
      startPractice(pool);
    }
  };

  const generate = useCallback(
    async (question) => {
      if (!settings.apiKey.trim()) {
        message.warning('请先在 API 设置中填入 API Key');
        setSettingsOpen(true);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setAnswerVisible(true);
      setAnswerLoading(true);
      setAnswerError('');
      setAnswerText('');
      try {
        let full = '';
        await generateAnswer({
          question,
          settings,
          signal: controller.signal,
          onDelta: (delta) => {
            full += delta;
            setAnswerText(full);
          },
        });
        if (!controller.signal.aborted && full) {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === question.id
                ? {
                    ...q,
                    aiAnswer: full,
                    aiGeneratedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : q,
            ),
          );
          message.success('答案生成完成');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          message.info('已停止生成');
        } else {
          setAnswerError(err.message || String(err));
          message.error('生成失败，请检查 API 配置');
        }
      } finally {
        if (abortRef.current === controller) {
          setAnswerLoading(false);
          abortRef.current = null;
        }
      }
    },
    [settings, message],
  );

  const handleReveal = () => {
    if (!currentQuestion) return;
    if (currentQuestion.aiAnswer) {
      setAnswerText(currentQuestion.aiAnswer);
      setAnswerError('');
      setAnswerVisible(true);
      return;
    }
    generate(currentQuestion);
  };

  const regenerate = () => {
    if (!currentQuestion) return;
    generate(currentQuestion);
  };

  const stopGenerating = () => {
    abortRef.current?.abort();
  };

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answerText);
      message.success('答案已复制');
    } catch {
      message.error('复制失败，请手动选择复制');
    }
  };

  const openSettings = () => {
    settingsForm.setFieldsValue(settings);
    setSettingsOpen(true);
  };

  const saveApiSettings = () => {
    settingsForm.validateFields().then((values) => {
      setSettings((prev) => ({ ...prev, ...values }));
      setSettingsOpen(false);
      message.success('API 设置已保存到本机浏览器');
    });
  };

  const handleTestConnection = async () => {
    const values = await settingsForm.validateFields();
    setTesting(true);
    try {
      const reply = await testConnection({ ...settings, ...values });
      message.success(`连接成功，模型返回：${reply.slice(0, 40) || '正常'}`);
    } catch (err) {
      message.error(`连接失败：${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const clearAllData = () => {
    clearLocalData();
    setQuestions([]);
    setSettings({ ...DEFAULT_SETTINGS });
    setCurrentQuestion(null);
    setDeckIds([]);
    setDeckIndex(0);
    setAnswerVisible(false);
    setAnswerText('');
    setAnswerError('');
    setSettingsOpen(false);
    message.success('本地数据已清空');
  };

  const practiceQuestion = (record) => {
    startPractice([record]);
    document.querySelector('.practice-panel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const tableColumns = [
    {
      title: '面试题',
      dataIndex: 'text',
      key: 'text',
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip title={text} placement="topLeft">
          <Text strong>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (value) =>
        value ? <Tag color="cyan">{value}</Tag> : <Text type="secondary">未分类</Text>,
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 90,
      render: (value) => <Tag color={difficultyColor(value)}>{value || '未设置'}</Tag>,
    },
    {
      title: '答案',
      dataIndex: 'aiAnswer',
      key: 'answered',
      width: 100,
      render: (value) =>
        value ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            已生成
          </Tag>
        ) : (
          <Tag>未生成</Tag>
        ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      render: (_, record) => (
        <Space size={4} wrap>
          <Button size="small" type="link" icon={<BulbOutlined />} onClick={() => practiceQuestion(record)}>
            练习
          </Button>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openQuestionModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="删除这道题？"
            description="AI 答案也会一并删除"
            okText="删除"
            cancelText="取消"
            onConfirm={() => handleDelete(record)}
          >
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const importTabs = [
    {
      key: 'lines',
      label: '逐行粘贴',
      children: (
        <div>
          <Paragraph type="secondary">每行一道题；也可以按「题目 | 分类 | 难度」格式导入。</Paragraph>
          <Input.TextArea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportParseResult(null);
            }}
            rows={10}
            placeholder={'第一道面试题\n第二道面试题\nReact 生命周期有哪些？ | React | 中等'}
          />
        </div>
      ),
    },
    {
      key: 'json',
      label: 'JSON 导入',
      children: (
        <div>
          <Paragraph type="secondary">数组元素可以是字符串，或包含 text / category / difficulty / source 的对象。</Paragraph>
          <Input.TextArea
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportParseResult(null);
            }}
            rows={10}
            placeholder={
              '["第一道面试题", {"text": "第二道面试题", "category": "React", "difficulty": "中等"}]'
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <ThunderboltOutlined />
          </div>
          <div className="brand-copy">
            <Title level={3} className="brand-title">
              本地面试题随机工具
            </Title>
            <Text type="secondary">题库、API Key、接口地址都只保存在当前浏览器</Text>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="stat-chip">
            <Text type="secondary">题目</Text>
            <Text strong>{questions.length}</Text>
          </div>
          <div className="stat-chip">
            <Text type="secondary">已答</Text>
            <Text strong>{answeredCount}</Text>
          </div>
          <Button type="primary" icon={<RetweetOutlined />} onClick={() => startPractice(questions)} disabled={!questions.length}>
            随机抽题
          </Button>
          <Button icon={<SettingOutlined />} onClick={openSettings}>
            API 设置
          </Button>
        </div>
      </header>

      <main className="workspace">
        <section className="panel library-panel">
          <div className="panel-head">
            <div className="panel-head-copy">
              <Title level={4}>题库管理</Title>
              <Text type="secondary">逐条管理面试题，点击「练习」进入随机练习区</Text>
            </div>
            <Space wrap className="panel-head-actions library-head-actions">
              <Button icon={<PlusOutlined />} type="primary" ghost onClick={() => openQuestionModal(null)}>
                添加题目
              </Button>
              <Button icon={<ImportOutlined />} onClick={openImportModal}>
                批量导入
              </Button>
              <Button icon={<DownOutlined />} onClick={exportJson}>
                导出
              </Button>
              <Popconfirm
                title="加载 3 道示例题？"
                description="示例题会追加到当前题库中"
                okText="加载"
                cancelText="取消"
                onConfirm={loadSamples}
              >
                <Button icon={<RobotOutlined />}>示例题库</Button>
              </Popconfirm>
            </Space>
          </div>

          <div className="filters">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索题目、分类"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              allowClear
              placeholder="全部分类"
              style={{ width: 160 }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categories.map((c) => ({ label: c, value: c }))}
            />
            <Select
              allowClear
              placeholder="全部难度"
              style={{ width: 140 }}
              value={difficultyFilter}
              onChange={setDifficultyFilter}
              options={DIFFICULTY_OPTIONS}
            />
          </div>

          <Table
            rowKey="id"
            size="middle"
            columns={tableColumns}
            dataSource={filteredQuestions}
            scroll={{ x: 860 }}
            pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
            locale={{
              emptyText: (
                <Empty description="题库为空，点击右上角「示例题库」或手动添加">
                  <Button type="primary" onClick={() => openQuestionModal(null)}>
                    添加第一道题
                  </Button>
                </Empty>
              ),
            }}
          />
        </section>

        <section className="panel practice-panel">
          <div className="panel-head">
            <div className="panel-head-copy">
              <Title level={4}>随机练习</Title>
              <Text type="secondary">答案默认隐藏，点击后才能看到</Text>
            </div>
            <Space size={6} wrap className="panel-head-actions practice-head-actions">
              <Tooltip title="上一张">
                <Button
                  shape="circle"
                  icon={<LeftOutlined />}
                  onClick={() => goToCard(deckIndex - 1)}
                  disabled={!currentQuestion || deckIndex <= 0}
                />
              </Tooltip>
              <Tooltip title="下一张">
                <Button
                  shape="circle"
                  icon={<RightOutlined />}
                  onClick={() => goToCard(deckIndex + 1)}
                  disabled={!currentQuestion || deckIndex >= deckIds.length - 1}
                />
              </Tooltip>
              <Button
                icon={<RetweetOutlined />}
                onClick={() => startPractice(filteredQuestions)}
                disabled={!filteredQuestions.length}
              >
                重新洗牌
              </Button>
            </Space>
          </div>

          {!currentQuestion ? (
            <div className="practice-empty">
              <Empty description="还没有抽题，点击「随机抽题」开始练习">
                <Button
                  type="primary"
                  icon={<RetweetOutlined />}
                  size="large"
                  onClick={() => startPractice(questions)}
                >
                  随机抽题
                </Button>
              </Empty>
            </div>
          ) : (
            <div className="anki-stage">
              <div className="anki-scene">
                <div className={`anki-card${answerVisible ? ' flipped' : ''}`}>
                  <div className="anki-face anki-front" aria-hidden={answerVisible}>
                    <div className="anki-face-head">
                      <Space wrap size={[6, 4]}>
                        {currentQuestion.category ? (
                          <Tag color="cyan">{currentQuestion.category}</Tag>
                        ) : (
                          <Tag>未分类</Tag>
                        )}
                        <Tag color={difficultyColor(currentQuestion.difficulty)}>
                          {currentQuestion.difficulty || '未设置难度'}
                        </Tag>
                        {currentQuestion.source && (
                          <Tag
                            icon={<LinkOutlined />}
                            color="geekblue"
                            style={{ cursor: 'pointer' }}
                            onClick={() => window.open(currentQuestion.source, '_blank', 'noopener')}
                          >
                            来源
                          </Tag>
                        )}
                      </Space>
                      <span className="deck-counter">
                        {deckIndex + 1} / {deckIds.length}
                      </span>
                    </div>

                    <div className="anki-front-body">
                      <Title level={4} className="question-text">
                        {currentQuestion.text}
                      </Title>
                      {currentQuestion.aiAnswer && (
                        <Tag icon={<CheckCircleOutlined />} color="green">
                          已缓存答案
                        </Tag>
                      )}
                    </div>

                    <div className="anki-front-foot">
                      <Button type="primary" size="large" icon={<BulbOutlined />} onClick={handleReveal}>
                        显示答案
                      </Button>
                    </div>
                  </div>

                  <div className="anki-face anki-back" aria-hidden={!answerVisible}>
                    <div className="anki-back-head">
                      <Space size={6} wrap>
                        <Text strong>AI 答案</Text>
                        {currentQuestion.aiGeneratedAt && (
                          <Tooltip title={new Date(currentQuestion.aiGeneratedAt).toLocaleString()}>
                            <Text type="secondary" className="generated-at">
                              生成于 {new Date(currentQuestion.aiGeneratedAt).toLocaleDateString('zh-CN')}
                            </Text>
                          </Tooltip>
                        )}
                      </Space>
                      <Space size={4} wrap>
                        {answerLoading ? (
                          <Button size="small" icon={<StopOutlined />} onClick={stopGenerating}>
                            停止
                          </Button>
                        ) : (
                          <>
                            <Button size="small" icon={<CopyOutlined />} onClick={copyAnswer} disabled={!answerText}>
                              复制
                            </Button>
                            <Button size="small" icon={<RedoOutlined />} onClick={regenerate}>
                              重新生成
                            </Button>
                          </>
                        )}
                        <Tooltip title="返回题目">
                          <Button size="small" icon={<EyeInvisibleOutlined />} onClick={resetAnswerView} />
                        </Tooltip>
                      </Space>
                    </div>

                    <div className="answer-scroll">
                      {answerError ? (
                        <Alert
                          type="error"
                          showIcon
                          message="生成失败"
                          description={
                            <div>
                              <Paragraph style={{ marginBottom: 8 }}>{answerError}</Paragraph>
                              <Text type="secondary">
                                请检查 API 地址、Key、模型名，以及浏览器跨域（CORS）限制。
                              </Text>
                            </div>
                          }
                          action={
                            <Button size="small" onClick={openSettings}>
                              打开设置
                            </Button>
                          }
                        />
                      ) : answerLoading && !answerText ? (
                        <div className="generating">
                          <RobotOutlined spin style={{ fontSize: 26, color: '#0f766e' }} />
                          <Text type="secondary">正在向模型请求答案…</Text>
                        </div>
                      ) : (
                        <div className="markdown-body">
                          {answerLoading && <span className="stream-cursor" />}
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{answerText}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    <div className="rating-bar">
                      <Text type="secondary" className="rating-label">
                        掌握程度
                      </Text>
                      <div className="rating-actions">
                        {RATING_OPTIONS.map((option) => (
                          <Button
                            key={option.key}
                            className="rating-btn"
                            style={{ borderColor: option.color, color: option.color }}
                            onClick={() => applyRating(option.key)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <Modal
        title={editingQuestion ? '编辑面试题' : '添加面试题'}
        open={questionModalOpen}
        onOk={handleQuestionSubmit}
        onCancel={() => setQuestionModalOpen(false)}
        okText={editingQuestion ? '保存' : '添加'}
        cancelText="取消"
        width={620}
      >
        <Form form={questionForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="text" label="面试题" rules={[{ required: true, message: '请输入面试题内容' }]}>
            <Input.TextArea rows={4} placeholder="输入从网上找到的面试题" />
          </Form.Item>
          <Flex gap={12}>
            <Form.Item name="category" label="分类" style={{ flex: 1 }}>
              <Select
                allowClear
                showSearch
                placeholder="如 React、JavaScript、浏览器"
                options={categories.map((c) => ({ label: c, value: c }))}
              />
            </Form.Item>
            <Form.Item name="difficulty" label="难度" style={{ flex: 1 }}>
              <Select options={DIFFICULTY_OPTIONS} />
            </Form.Item>
          </Flex>
          <Form.Item name="source" label="来源链接（可选）">
            <Input placeholder="https:// 原题出处" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量导入面试题"
        open={importModalOpen}
        onOk={handleImportConfirm}
        onCancel={() => setImportModalOpen(false)}
        okText="确认导入"
        cancelText="取消"
        width={640}
        okButtonProps={{ disabled: !parseBulkInput(importText).items.length }}
      >
        <Tabs items={importTabs} />
        <Space>
          <Button icon={<SearchOutlined />} onClick={handleImportPreview}>
            解析预览
          </Button>
          {importParseResult &&
            (importParseResult.error ? (
              <Text type="danger">{importParseResult.error}</Text>
            ) : (
              <Text type="success">解析出 {importParseResult.items.length} 道题</Text>
            ))}
        </Space>
      </Modal>

      <Drawer
        title={
          <Space>
            <ApiOutlined />
            API 设置
          </Space>
        }
        width={460}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        extra={
          <Button type="primary" onClick={saveApiSettings}>
            保存设置
          </Button>
        }
      >
        <Form form={settingsForm} layout="vertical" initialValues={settings}>
          <Alert
            type="info"
            showIcon
            message="仅保存在当前浏览器"
            description="API Key 只存于浏览器的 localStorage，不会发送到任何其他服务器；只有点击「查看答案」时才直接调用你填写的接口地址。"
            style={{ marginBottom: 20 }}
          />
          <Form.Item
            name="baseUrl"
            label="API 地址"
            extra="OpenAI 兼容接口的基础地址，例如 https://api.openai.com/v1"
            rules={[{ required: true, message: '请输入 API 地址' }]}
          >
            <Input prefix={<ApiOutlined />} placeholder="https://api.openai.com/v1" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key">
            <Input.Password placeholder="sk-..." autoComplete="off" />
          </Form.Item>
          <Form.Item name="model" label="模型" rules={[{ required: true, message: '请输入模型名称' }]}>
            <Input placeholder="gpt-4o-mini" />
          </Form.Item>
          <Form.Item name="systemPrompt" label="系统提示词">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Flex gap={16}>
            <Form.Item name="temperature" label="温度" style={{ flex: 1 }}>
              <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxTokens" label="最大 Token" style={{ flex: 1 }}>
              <InputNumber min={64} max={16384} step={128} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="stream" label="流式输出" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
          </Flex>
          <Space wrap>
            <Button
              icon={<ApiOutlined />}
              loading={testing}
              onClick={handleTestConnection}
              disabled={!apiKeyValue}
            >
              测试连接
            </Button>
            <Popconfirm
              title="清空全部本地数据？"
              description="题库、答案缓存和 API 设置都会被删除"
              okText="清空"
              cancelText="取消"
              onConfirm={clearAllData}
            >
              <Button danger>清空本机数据</Button>
            </Popconfirm>
          </Space>
        </Form>
      </Drawer>
    </div>
  );
}

export default function App() {
  return (
    <AntApp>
      <AppInner />
    </AntApp>
  );
}
