import React, { PropTypes } from 'react';
import objectPath from 'object-path';
import shallowequal from 'shallowequal';
import ExpandIcon from './ExpandIcon';

const TableCell = React.createClass({
  propTypes: {                      //属性同上
    record: PropTypes.object,
    prefixCls: PropTypes.string,
    isColumnHaveExpandIcon: PropTypes.bool,
    index: PropTypes.number,
    expanded: PropTypes.bool,
    expandable: PropTypes.any,
    onExpand: PropTypes.func,
    needIndentSpaced: PropTypes.bool,
    indent: PropTypes.number,
    indentSize: PropTypes.number,
    column: PropTypes.object,
  },
  shouldComponentUpdate(nextProps) {      //同上
    return !shallowequal(nextProps, this.props);
  },
  isInvalidRenderCellText(text) {         //不合法的text渲染,null 且 非react组件 且Object
    return text && !React.isValidElement(text) &&
      Object.prototype.toString.call(text) === '[object Object]';
  },
  render() {
    const { record, indentSize, prefixCls, indent,
            isColumnHaveExpandIcon, index, expandable, onExpand,
            needIndentSpaced, expanded, column } = this.props;

    const { dataIndex, render, className } = column;

    let text = objectPath.get(record, dataIndex); //取record的dataIndex值属性
    let tdProps;
    let colSpan;
    let rowSpan;

    if (render) {         //如果column有render函数
      text = render(text, record, index);
      if (this.isInvalidRenderCellText(text)) { //如果text仍然不合法,issue:以下代码没明白意思
        tdProps = text.props || {};
        rowSpan = tdProps.rowSpan;
        colSpan = tdProps.colSpan;
        text = text.children;
      }
    }

    // Fix https://github.com/ant-design/ant-design/issues/1202
    if (this.isInvalidRenderCellText(text)) {   //如果不合法,不渲染text
      text = null;
    }

    const expandIcon = (          //渲染展开图标
      <ExpandIcon
        expandable={expandable}
        prefixCls={prefixCls}
        onExpand={onExpand}
        needIndentSpaced={needIndentSpaced}
        expanded={expanded}
        record={record}
      />
    );

    const indentText = (      //渲染层级*层级宽度的宽的空位
      <span
        style={{ paddingLeft: `${indentSize * indent}px` }}
        className={`${prefixCls}-indent indent-level-${indent}`}
      />
    );

    if (rowSpan === 0 || colSpan === 0) { //如果跨行或者跨列为0,不渲染
      return null;
    }

    //isColumnHaveExpandIcon:如果有展开图标
    return (
      <td
        colSpan={colSpan}
        rowSpan={rowSpan}
        className={className || ''}
      >
        {isColumnHaveExpandIcon ? indentText : null }
        {isColumnHaveExpandIcon ? expandIcon : null}
        {text}
      </td>
    );
  },
});

export default TableCell;
